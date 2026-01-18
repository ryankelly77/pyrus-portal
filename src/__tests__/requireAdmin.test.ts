import { requireAdmin } from '../lib/auth/requireAdmin';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { prisma } from '../lib/prisma';
import { NextResponse } from 'next/server';

jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));
jest.mock('@supabase/ssr');
jest.mock('../lib/prisma', () => ({
  prisma: {
    profiles: {
      findUnique: jest.fn(() => ({
        id: 'mock-profile-id',
        role: 'admin',
      })),
    },
    user: {
      findUnique: jest.fn(() => ({
        id: 'mock-user-id',
        role: 'admin',
      })),
    },
  },
}));

describe('requireAdmin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 response for no user session', async () => {
    (cookies as jest.Mock).mockReturnValue({ get: () => null });
    (createServerClient as jest.Mock).mockReturnValue({
      auth: {
        getUser: jest.fn(() => Promise.resolve({
          data: { user: null },
          error: null,
        })),
      },
    });

    const result = await requireAdmin();
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(401);
  });

  it('should return 403 response for non-admin user', async () => {
    const mockUser = { id: 'mock-user-id', role: 'user' };
    (cookies as jest.Mock).mockReturnValue({ get: () => ({ value: 'user' }) });
    (createServerClient as jest.Mock).mockReturnValue({
      auth: {
        getUser: jest.fn(() => Promise.resolve({
          data: { user: mockUser },
          error: null,
        })),
      },
    });
    (prisma.profiles.findUnique as jest.Mock).mockResolvedValue({ role: 'user' });

    const result = await requireAdmin();
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(403);
  });

  it('should return user and profile for admin user', async () => {
    const mockUser = { id: 'mock-user-id', role: 'admin' };
    const mockProfile = { role: 'admin' };
    (cookies as jest.Mock).mockReturnValue({ get: () => ({ value: 'admin' }) });
    (createServerClient as jest.Mock).mockReturnValue({
      auth: {
        getUser: jest.fn(() => Promise.resolve({
          data: { user: mockUser },
          error: null,
        })),
      },
    });
    (prisma.profiles.findUnique as jest.Mock).mockResolvedValue(mockProfile);

    const result = await requireAdmin();
    expect(result).toEqual({ user: mockUser, profile: mockProfile });
  });
});