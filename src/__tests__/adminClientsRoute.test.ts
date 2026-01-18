import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { GET, POST } from '@/app/api/admin/clients/route';

jest.mock('@/lib/auth/requireAdmin');
jest.mock('@/lib/prisma', () => ({
  prisma: {
    clients: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
}));

describe('Admin Clients API Routes', () => {
  describe('GET /api/admin/clients', () => {
    it('returns 401 when no auth', async () => {
      (requireAdmin as jest.Mock).mockImplementation(() => {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      });

      const req = new Request('http://localhost/api/admin/clients', { method: 'GET' });
      const res = await GET(req);

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe('Unauthorized');
    });

    it('returns 200 with client list when admin', async () => {
      (requireAdmin as jest.Mock).mockImplementation(() => {
        return { user: { id: 'admin-id' }, profile: { role: 'admin' } };
      });

      const mockClients = [
        { id: '1', name: 'Client 1' },
        { id: '2', name: 'Client 2' },
      ];
      (prisma.clients.findMany as jest.Mock).mockResolvedValue(mockClients);

      const req = new Request('http://localhost/api/admin/clients', { method: 'GET' });
      const res = await GET(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual(mockClients);
    });
  });

  describe('POST /api/admin/clients', () => {
    it('returns 401 when no auth', async () => {
      (requireAdmin as jest.Mock).mockImplementation(() => {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      });

      const req = new Request('http://localhost/api/admin/clients', { method: 'POST' });
      const res = await POST(req);

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe('Unauthorized');
    });

    it('returns 400 when validation fails', async () => {
      (requireAdmin as jest.Mock).mockImplementation(() => {
        return { user: { id: 'admin-id' }, profile: { role: 'admin' } };
      });

      const req = new Request('http://localhost/api/admin/clients', {
        method: 'POST',
        body: JSON.stringify({}), // Missing required fields
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBeDefined();
    });

    it('returns 201 when valid data and admin', async () => {
      (requireAdmin as jest.Mock).mockImplementation(() => {
        return { user: { id: 'admin-id' }, profile: { role: 'admin' } };
      });

      const newClient = { name: 'New Client' };
      const createdClient = { id: '3', ...newClient };
      (prisma.clients.create as jest.Mock).mockResolvedValue(createdClient);

      const req = new Request('http://localhost/api/admin/clients', {
        method: 'POST',
        body: JSON.stringify(newClient),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await POST(req);

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body).toEqual(createdClient);
    });
  });
});