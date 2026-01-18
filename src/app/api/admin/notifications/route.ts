import { NextRequest, NextResponse } from 'next/server'
import { dbPool } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { CustomError } from '@/lib/utils/api-helpers';

export const dynamic = 'force-dynamic'

interface NotificationItem {
  id: string
  type: string
  title: string
  description: string
  clientName: string
  clientId: string
  status?: string
  metadata?: Record<string, unknown>
  timestamp: string
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { user, profile } = auth;

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');
  const type = searchParams.get('type'); // 'all', 'email', 'login', 'proposal'

  const notifications: NotificationItem[] = [];

  // Fetch email communications
  if (!type || type === 'all' || type === 'email') {
    const emailsResult = await dbPool.query(
      `SELECT
        cc.id,
        cc.comm_type,
        cc.title,
        cc.subject,
        cc.status,
        cc.recipient_email,
        cc.opened_at,
        cc.clicked_at,
        cc.sent_at,
        cc.created_at,
        c.id as client_id,
        c.name as client_name,
        c.contact_name
      FROM client_communications cc
      JOIN clients c ON c.id = cc.client_id
      WHERE cc.comm_type LIKE 'email%'
      ORDER BY cc.created_at DESC
      LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    for (const email of emailsResult.rows) {
      let description = `Sent to ${email.recipient_email || email.contact_name || 'client'}`;
      if (email.status === 'opened' && email.opened_at) {
        description = `Opened by ${email.recipient_email || 'client'}`;
      } else if (email.status === 'clicked' && email.clicked_at) {
        description = `Link clicked by ${email.recipient_email || 'client'}`;
      } else if (email.status === 'delivered') {
        description = `Delivered to ${email.recipient_email || 'client'}`;
      } else if (email.status === 'failed' || email.status === 'bounced') {
        description = `Failed to deliver to ${email.recipient_email || 'client'}`;
      }

      notifications.push({
        id: email.id,
        type: 'email',
        title: email.title || email.subject || 'Email',
        description,
        clientName: email.client_name,
        clientId: email.client_id,
        status: email.status,
        timestamp: email.sent_at || email.created_at,
      });
    }
  }

  // Return notifications
  return NextResponse.json(notifications, { status: 200 });
}
