import { GET } from '../app/api/admin/notifications/route';
import { requireAdmin } from '../lib/auth/requireAdmin';
import { dbPool } from '../lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

jest.mock('../lib/auth/requireAdmin');
jest.mock('../lib/prisma', () => ({
  dbPool: {
    query: jest.fn(),
  },
}));

describe('GET /api/admin/notifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 if user is not authenticated', async () => {
    (requireAdmin as jest.Mock).mockImplementation(() => {
      const { NextResponse } = require('next/server');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    });

    const request = new NextRequest('http://localhost/api/admin/notifications');
    const response = await GET(request);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Unauthorized' });
  });

  it('should return notifications for an admin user', async () => {
    (requireAdmin as jest.Mock).mockResolvedValue(true);
    (dbPool.query as jest.Mock).mockResolvedValue({
      rows: [
        {
          id: '1',
          comm_type: 'email',
          title: 'Test Email',
          subject: 'Test Subject',
          status: 'delivered',
          recipient_email: 'test@example.com',
          sent_at: '2026-01-18T12:00:00Z',
          created_at: '2026-01-18T11:00:00Z',
          client_id: 'client_1',
          client_name: 'Test Client',
        },
      ],
    });

    const request = new NextRequest('http://localhost/api/admin/notifications?type=email&limit=1&offset=0');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toEqual([
      {
        id: '1',
        type: 'email',
        title: 'Test Email',
        description: 'Delivered to test@example.com',
        clientName: 'Test Client',
        clientId: 'client_1',
        status: 'delivered',
        timestamp: '2026-01-18T12:00:00Z',
      },
    ]);
  });

  it('should return an empty array if no notifications are found', async () => {
    (requireAdmin as jest.Mock).mockResolvedValue(true);
    (dbPool.query as jest.Mock).mockResolvedValue({ rows: [] });

    const request = new NextRequest('http://localhost/api/admin/notifications?type=email&limit=1&offset=0');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toEqual([]);
  });
});