import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';

export const dynamic = 'force-dynamic';

// GET - List enrollments for this automation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const supabase = await createClient() as any;

    let query = supabase
      .from('email_automation_enrollments')
      .select(`
        *,
        email_automation_step_logs(*)
      `)
      .eq('automation_id', id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: enrollments, error, count } = await query;

    if (error) {
      console.error('Error fetching enrollments:', error);
      return NextResponse.json({ error: 'Failed to fetch enrollments' }, { status: 500 });
    }

    // Get total count
    const { count: totalCount } = await supabase
      .from('email_automation_enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('automation_id', id);

    return NextResponse.json({
      enrollments: enrollments || [],
      total: totalCount || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error in GET enrollments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
