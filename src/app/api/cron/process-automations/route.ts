import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { sendTemplatedEmail } from '@/lib/email/template-service';
import { evaluateConditions } from '@/lib/email/automation-service';

// Verify cron secret to prevent unauthorized access
function verifyCronSecret(request: Request): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) return true; // Allow in dev
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Use any type until database types are regenerated
  const supabase = await createServiceClient() as any;
  const now = new Date();

  // Find enrollments ready to process
  const { data: enrollments } = await supabase
    .from('email_automation_enrollments' as any)
    .select(`
      *,
      email_automations(*, email_automation_steps(*))
    `)
    .eq('status', 'active')
    .lte('next_step_due_at', now.toISOString())
    .limit(50) as { data: any[] | null };

  if (!enrollments?.length) {
    return NextResponse.json({ processed: 0 });
  }

  let processed = 0;
  let sent = 0;
  let skipped = 0;
  let stopped = 0;

  for (const enrollment of enrollments) {
    processed++;

    const automation = enrollment.email_automations as any;
    if (!automation) continue;

    // Get current step
    const steps = automation.email_automation_steps?.sort(
      (a: any, b: any) => a.step_order - b.step_order
    );
    const currentStep = steps?.find(
      (s: any) => s.step_order === enrollment.current_step_order + 1
    );

    if (!currentStep) {
      // No more steps - complete enrollment
      await supabase
        .from('email_automation_enrollments' as any)
        .update({
          status: 'completed',
          updated_at: now.toISOString(),
        })
        .eq('id', enrollment.id);
      continue;
    }

    // Refresh context data (get latest state from trigger record)
    const contextData = await refreshContextData(
      supabase,
      enrollment.trigger_record_type,
      enrollment.trigger_record_id,
      enrollment.context_data as Record<string, any>
    );

    // Check global stop conditions
    if (evaluateConditions(automation.global_stop_conditions, contextData)) {
      await supabase
        .from('email_automation_enrollments' as any)
        .update({
          status: 'stopped',
          stopped_reason: 'Stop condition met',
          stopped_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('id', enrollment.id);
      stopped++;

      // Log the stop
      await supabase.from('email_automation_step_logs' as any).insert({
        enrollment_id: enrollment.id,
        step_id: currentStep.id,
        scheduled_for: enrollment.next_step_due_at,
        processed_at: now.toISOString(),
        status: 'stopped',
        skip_reason: 'Global stop condition met',
      });

      continue;
    }

    // Check step skip conditions
    if (evaluateConditions(currentStep.skip_conditions, contextData)) {
      skipped++;

      // Log the skip
      await supabase.from('email_automation_step_logs' as any).insert({
        enrollment_id: enrollment.id,
        step_id: currentStep.id,
        scheduled_for: enrollment.next_step_due_at,
        processed_at: now.toISOString(),
        status: 'skipped',
        skip_reason: 'Step skip condition met',
      });

      // Move to next step
      await advanceToNextStep(supabase, enrollment, steps, currentStep);
      continue;
    }

    // Check step send conditions
    if (!evaluateConditions(currentStep.send_conditions, contextData)) {
      // Conditions not met - reschedule for later (1 hour)
      await supabase
        .from('email_automation_enrollments' as any)
        .update({
          next_step_due_at: new Date(now.getTime() + 60 * 60 * 1000).toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('id', enrollment.id);
      continue;
    }

    // Send the email
    try {
      const result = await sendTemplatedEmail({
        to: enrollment.recipient_email,
        templateSlug: currentStep.template_slug,
        variables: {
          ...contextData,
          recipientFirstName: enrollment.recipient_name?.split(' ')[0] || '',
          recipientName: enrollment.recipient_name,
        },
        subject: currentStep.subject_override || undefined,
      });

      if (result.success) {
        sent++;

        // Log success
        await supabase.from('email_automation_step_logs' as any).insert({
          enrollment_id: enrollment.id,
          step_id: currentStep.id,
          scheduled_for: enrollment.next_step_due_at,
          processed_at: now.toISOString(),
          status: 'sent',
          email_log_id: result.logId || null,
        });

        // Advance to next step
        await advanceToNextStep(supabase, enrollment, steps, currentStep);
      } else {
        // Log failure
        await supabase.from('email_automation_step_logs' as any).insert({
          enrollment_id: enrollment.id,
          step_id: currentStep.id,
          scheduled_for: enrollment.next_step_due_at,
          processed_at: now.toISOString(),
          status: 'failed',
          error_message: result.error || 'Unknown error',
        });
      }
    } catch (error) {
      // Log failure
      await supabase.from('email_automation_step_logs' as any).insert({
        enrollment_id: enrollment.id,
        step_id: currentStep.id,
        scheduled_for: enrollment.next_step_due_at,
        processed_at: now.toISOString(),
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return NextResponse.json({
    processed,
    sent,
    skipped,
    stopped,
  });
}

async function refreshContextData(
  supabase: any,
  triggerRecordType: string,
  triggerRecordId: string,
  existingContext: Record<string, any>
): Promise<Record<string, any>> {
  if (triggerRecordType === 'recommendation_invite') {
    const { data } = await supabase
      .from('recommendation_invites')
      .select('*, recommendations(*, clients(*))')
      .eq('id', triggerRecordId)
      .single();

    if (data) {
      // Format the proposal sent date from the invite's sent_at
      const proposalSentDate = data.sent_at
        ? new Date(data.sent_at).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })
        : existingContext.proposalSentDate || '';

      return {
        ...existingContext,
        email_opened: !!data.email_opened_at,
        proposal_viewed: !!data.viewed_at,
        deal_status: data.recommendations?.status,
        clientName: data.recommendations?.clients?.name,
        proposalSentDate,
      };
    }
  }

  return existingContext;
}

async function advanceToNextStep(
  supabase: any,
  enrollment: any,
  steps: any[],
  currentStep: any
) {
  const nextStep = steps.find((s: any) => s.step_order === currentStep.step_order + 1);

  if (nextStep) {
    // Calculate next due date
    const delayMs =
      nextStep.delay_days * 24 * 60 * 60 * 1000 +
      nextStep.delay_hours * 60 * 60 * 1000;
    const nextDueAt = new Date(Date.now() + delayMs);

    await supabase
      .from('email_automation_enrollments' as any)
      .update({
        current_step_order: currentStep.step_order,
        next_step_due_at: nextDueAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', enrollment.id);
  } else {
    // No more steps - complete
    await supabase
      .from('email_automation_enrollments' as any)
      .update({
        status: 'completed',
        current_step_order: currentStep.step_order,
        updated_at: new Date().toISOString(),
      })
      .eq('id', enrollment.id);
  }
}
