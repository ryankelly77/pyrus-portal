import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';

export const dynamic = 'force-dynamic';

// GET - List all automations
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;

    const supabase = await createClient() as any;

    const { data: automations, error } = await supabase
      .from('email_automations')
      .select(`
        *,
        email_automation_steps(count),
        email_automation_enrollments(count)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching automations:', error);
      return NextResponse.json({ error: 'Failed to fetch automations' }, { status: 500 });
    }

    // Get counts separately since Supabase doesn't support count in nested selects easily
    const automationsWithCounts = await Promise.all(
      (automations || []).map(async (automation: any) => {
        const { count: stepsCount } = await supabase
          .from('email_automation_steps')
          .select('*', { count: 'exact', head: true })
          .eq('automation_id', automation.id);

        const { count: enrollmentsCount } = await supabase
          .from('email_automation_enrollments')
          .select('*', { count: 'exact', head: true })
          .eq('automation_id', automation.id);

        return {
          ...automation,
          steps_count: stepsCount || 0,
          enrollments_count: enrollmentsCount || 0,
        };
      })
    );

    return NextResponse.json({ automations: automationsWithCounts });
  } catch (error) {
    console.error('Error in GET automations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new automation
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;

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

    if (!name || !slug || !triggerType) {
      return NextResponse.json(
        { error: 'Name, slug, and trigger type are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient() as any;

    // Format time values for PostgreSQL (HH:MM:SS format)
    const formatTime = (time: string | undefined, defaultTime: string) => {
      const t = time || defaultTime;
      // If already has seconds, return as-is, otherwise add :00
      return t.includes(':') && t.split(':').length === 2 ? `${t}:00` : t;
    };

    // Create the automation
    const { data: automation, error: automationError } = await supabase
      .from('email_automations')
      .insert({
        name,
        slug,
        description: description || null,
        trigger_type: triggerType,
        trigger_conditions: triggerConditions || {},
        global_stop_conditions: globalStopConditions || {},
        send_window_start: formatTime(sendWindowStart, '09:00'),
        send_window_end: formatTime(sendWindowEnd, '17:00'),
        send_window_timezone: sendWindowTimezone || 'America/Chicago',
        send_on_weekends: sendOnWeekends || false,
        is_active: isActive ?? true,
      })
      .select()
      .single();

    if (automationError) {
      console.error('Error creating automation:', automationError);
      console.error('Attempted to insert:', {
        name,
        slug,
        triggerType,
        description: description || null,
      });
      if (automationError.code === '23505') {
        return NextResponse.json({ error: 'Slug already exists' }, { status: 400 });
      }
      // Return more detailed error for debugging
      return NextResponse.json(
        { error: `Failed to create automation: ${automationError.message || automationError.code || 'Unknown error'}` },
        { status: 500 }
      );
    }

    // Create steps if provided
    if (steps && steps.length > 0) {
      // Validate all steps have template_slug
      const invalidSteps = steps.filter((step: any) => !step.template_slug);
      if (invalidSteps.length > 0) {
        // Rollback automation creation
        await supabase.from('email_automations').delete().eq('id', automation.id);
        return NextResponse.json(
          { error: 'All email steps must have a template selected' },
          { status: 400 }
        );
      }

      const stepsToInsert = steps.map((step: any, index: number) => ({
        automation_id: automation.id,
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
        console.error('Error creating steps:', stepsError);
        // Rollback automation creation
        await supabase.from('email_automations').delete().eq('id', automation.id);

        // Provide more specific error message
        if (stepsError.code === '23503') {
          return NextResponse.json(
            { error: 'Invalid email template selected. Please select a valid template.' },
            { status: 400 }
          );
        }
        return NextResponse.json({ error: 'Failed to create automation steps' }, { status: 500 });
      }
    }

    return NextResponse.json({ automation }, { status: 201 });
  } catch (error) {
    console.error('Error in POST automation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
