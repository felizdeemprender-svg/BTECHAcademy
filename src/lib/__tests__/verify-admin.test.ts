import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockRequest } from './helpers';

// Mock de firebase-admin
vi.mock('firebase-admin/app', () => ({
  initializeApp: vi.fn(),
  getApps: vi.fn(() => []),
  cert: vi.fn(),
}));

vi.mock('@/firebase/admin', () => ({
  getAdminAuth: vi.fn(),
}));

import { getAdminAuth } from '@/firebase/admin';
import { verifyAdmin } from '@/lib/auth/verify-admin';

describe('verifyAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('cuando NO se envía token', () => {
    it('retorna null si no hay header Authorization', async () => {
      const req = createMockRequest();
      const result = await verifyAdmin(req);
      expect(result).toBeNull();
    });

    it('retorna null si el header Authorization no empieza con Bearer', async () => {
      const req = createMockRequest({ headers: { Authorization: 'Basic abc123' } });
      const result = await verifyAdmin(req);
      expect(result).toBeNull();
    });
  });

  describe('cuando el token es inválido', () => {
    it('retorna null si verifyIdToken lanza error', async () => {
      vi.mocked(getAdminAuth).mockReturnValue({
        verifyIdToken: vi.fn().mockRejectedValue(new Error('auth/id-token-expired')),
      } as any);

      const req = createMockRequest({ headers: { Authorization: 'Bearer token-invalido' } });
      const result = await verifyAdmin(req);
      expect(result).toBeNull();
    });
  });

  describe('cuando el token es válido pero NO es admin', () => {
    it('retorna null si el usuario no tiene claim admin: true', async () => {
      vi.mocked(getAdminAuth).mockReturnValue({
        verifyIdToken: vi.fn().mockResolvedValue({ uid: 'user-123', admin: false }),
      } as any);

      const req = createMockRequest({ headers: { Authorization: 'Bearer token-valido-no-admin' } });
      const result = await verifyAdmin(req);
      expect(result).toBeNull();
    });

    it('retorna null si el claim admin no existe', async () => {
      vi.mocked(getAdminAuth).mockReturnValue({
        verifyIdToken: vi.fn().mockResolvedValue({ uid: 'user-123' }),
      } as any);

      const req = createMockRequest({ headers: { Authorization: 'Bearer token-valido-sin-admin' } });
      const result = await verifyAdmin(req);
      expect(result).toBeNull();
    });
  });

  describe('cuando el token es válido Y es admin', () => {
    it('retorna el uid del admin', async () => {
      vi.mocked(getAdminAuth).mockReturnValue({
        verifyIdToken: vi.fn().mockResolvedValue({ uid: 'admin-uid-123', admin: true }),
      } as any);

      const req = createMockRequest({ headers: { Authorization: 'Bearer token-admin-valido' } });
      const result = await verifyAdmin(req);
      expect(result).toBe('admin-uid-123');
    });
  });
});
