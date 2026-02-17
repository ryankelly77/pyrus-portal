import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';

export const dynamic = 'force-dynamic';

// GET - Get single automation with steps
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const supabase = await createClient() as any;

    const { data: automation, error } = await supabase
      .from('email_automations')
      .select(`
        *,
        email_automation_steps(*)
      `)
      .eq('id', id)
      .single();

    if (error || !automation) {
      return NextResponse.json({ error: 'Automation not found' }, { status: 404 });
    }

    // Sort steps by step_order
    if (automation.email_automation_steps) {
      automation.email_automation_steps.sort(
        (a: any, b: any) => a.step_order - b.step_order
      );
    }

    return NextResponse.json({ automation });
  } catch (error) {
    console.error('Error in GET automation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update automation and steps
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const body = await request.json();
    const {
      name,
      slug,
      description,
      triggerType,
      triggerConditions,
      globalStopConditions,
      sendWindowStart,
      sendWindowEnd,
      sendWindowTimezone,
      sendOnWeekends,
      isActive,
      steps,
    } = body;

    const supabase = await createClient() as any;

    // Format time values for PostgreSQL (HH:MM:SS format)
    const formatTime = (time: string) => {
      return time.includes(':') && time.split(':').length === 2 ? `${time}:00` : time;
    };

    // Update the automation
    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name;
    if (slug !== undefined) updates.slug = slug;
    if (description !== undefined) updates.description = description;
    if (triggerType !== undefined) updates.trigger_type = triggerType;
    if (triggerConditions !== undefined) updates.trigger_conditions = triggerConditions;
    if (globalStopConditions !== undefined) updates.global_stop_conditions = globalStopConditions;
    if (sendWindowStart !== undefined) updates.send_window_start = formatTime(sendWindowStart);
    if (sendWindowEnd !== undefined) updates.send_window_end = formatTime(sendWindowEnd);
    if (sendWindowTimezone !== undefined) updates.send_window_timezone = sendWindowTimezone;
    if (sendOnWeekends !== undefined) updates.send_on_weekends = sendOnWeekends;
    if (isActive !== undefined) updates.is_active = isActive;

    const { data: automation, error: automationError } = await supabase
      .from('email_automations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (automationError) {
      console.error('Error updating automation:', automationError);
      if (automationError.code === '23505') {
        return NextResponse.json({ error: 'Slug already exists' }, { status: 400 });
      }
      return NextResponse.json({ error: 'Failed to update automation' }, { status: 500 });
    }

    // Update steps if provided
    if (steps !== undefined) {
      // Delete existing steps
      await supabase
        .from('email_automation_steps')
        .delete()
        .eq('automation_id', id);

      // Insert new steps
      if (steps.length > 0) {
        // Validate all steps have template_slug
        const invalidSteps = steps.filter((step: any) => !step.template_slug);
        if (invalidSteps.length > 0) {
          return NextResponse.json(
            { error: 'All email steps must have a template selected' },
            { status: 400 }
          );
        }

        const stepsToInsert = steps.map((step: any, index: number) => ({
          automation_id: id,
          step_order: step.step_order || index + 1,
          delay_days: step.delay_days || 0,
          delay_hours: step.delay_hours || 0,
          delay_from: step.delay_from || 'previous_step',
          template_slug: step.template_slug,
          subject_override: step.subject_override || null,
          send_conditions: step.send_conditions || {},
          skip_conditions: step.skip_conditions || {},
        }));

        const { error: stepsError } = await supabase
          .from('email_automation_steps')
          .insert(stepsToInsert);

        if (stepsError) {
          console.error('Error updating steps:', stepsError);
          // Provide more specific error message
          if (stepsError.code === '23503') {
            return NextResponse.json(
              { error: 'Invalid email template selected. Please select a valid template.' },
              { status: 400 }
            );
          }
          return NextResponse.json({ error: 'Failed to update steps' }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ automation });
  } catch (error) {
    console.error('Error in PATCH automation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete automation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const supabase = await createClient() as any;

    // Check for active enrollments
    const { count: activeEnrollments } = await supabase
      .from('email_automation_enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('automation_id', id)
      .eq('status', 'active');

    if (activeEnrollments && activeEnrollments > 0) {
      return NextResponse.json(
        { error: `Cannot delete automation with ${activeEnrollments} active enrollments` },
        { status: 400 }
      );
    }

    // Delete the automation (cascades to steps and enrollments)
    const { error } = await supabase
      .from('email_automations')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting automation:', error);
      return NextResponse.json({ error: 'Failed to delete automation' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE automation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
