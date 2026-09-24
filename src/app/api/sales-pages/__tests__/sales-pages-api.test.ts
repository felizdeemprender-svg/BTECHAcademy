import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST, PUT, DELETE } from '../route';
import { NextRequest } from 'next/server';
import { authenticateCaller } from '@/lib/api/mentor-auth';

// Mock dependencias
vi.mock('@/lib/api/mentor-auth');
vi.mock('@/domain/sales-pages/use-cases/create-sales-page-use-case', () => {
  return {
    CreateSalesPageUseCase: class {
      execute = vi.fn().mockResolvedValue(undefined);
    }
  };
});
vi.mock('@/domain/sales-pages/use-cases/update-sales-page-use-case', () => {
  return {
    UpdateSalesPageUseCase: class {
      execute = vi.fn().mockResolvedValue(undefined);
    }
  };
});
vi.mock('@/domain/sales-pages/use-cases/delete-sales-page-use-case', () => {
  return {
    DeleteSalesPageUseCase: class {
      execute = vi.fn().mockResolvedValue(undefined);
    }
  };
});
// Mock the handleListPacks for non 'type=all' calls
vi.mock('@/lib/api/sales-page-handlers', () => ({
  handleListPacks: vi.fn().mockResolvedValue(new Response(JSON.stringify([{ id: 'pack-1' }]), { status: 200 }))
}));
// Mock gateway resolution
vi.mock('@/lib/api/gateway', () => ({
  resolveGateway: vi.fn().mockResolvedValue({})
}));

// Mock repository calls directly because the route instantiates it
vi.mock('@/data/firestore/admin-sales-page-repo', () => {
  return {
    AdminSalesPageRepository: class {
      listAll = vi.fn().mockResolvedValue([{ id: 'admin-page', referidoId: 'ref-1' }, { id: 'admin-page-2', referidoId: 'ref-2' }]);
      listByMentor = vi.fn().mockResolvedValue([{ id: 'mentor-page' }]);
    }
  };
});

describe('Sales Pages API Handlers', () => {
  const mockAuthenticateCaller = authenticateCaller as import('vitest').Mock;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Autenticación General', () => {
    it('debe devolver 401 si no hay usuario autenticado', async () => {
      mockAuthenticateCaller.mockResolvedValue(null);
      const req = new NextRequest('http://localhost/api/sales-pages');
      
      const resGet = await GET(req);
      expect(resGet.status).toBe(401);
      
      const resPost = await POST(req);
      expect(resPost.status).toBe(401);
      
      const resPut = await PUT(req);
      expect(resPut.status).toBe(401);
      
      const resDelete = await DELETE(req);
      expect(resDelete.status).toBe(401);
    });
  });

  describe('GET Handler', () => {
    it('debe devolver landings del mentor (type=all)', async () => {
      mockAuthenticateCaller.mockResolvedValue({ uid: 'mentor-1', isAdmin: false });
      const req = new NextRequest('http://localhost/api/sales-pages?type=all');
      
      const res = await GET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual([{ id: 'mentor-page' }]);
    });

    it('debe filtrar landings por referidoId', async () => {
      mockAuthenticateCaller.mockResolvedValue({ uid: 'mentor-1', isAdmin: false });
      const req = new NextRequest('http://localhost/api/sales-pages?type=all&referidoId=ref-2');
      
      const res = await GET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual([{ id: 'admin-page-2', referidoId: 'ref-2' }]);
    });
  });

  describe('POST Handler', () => {
    it('debe devolver 400 si faltan pageId o data', async () => {
      mockAuthenticateCaller.mockResolvedValue({ uid: 'mentor-1', isAdmin: false });
      const req = new NextRequest('http://localhost/api/sales-pages', {
        method: 'POST',
        body: JSON.stringify({ data: { title: 'No ID' } })
      });
      
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('debe crear una landing correctamente', async () => {
      mockAuthenticateCaller.mockResolvedValue({ uid: 'mentor-1', isAdmin: false });
      const req = new NextRequest('http://localhost/api/sales-pages', {
        method: 'POST',
        body: JSON.stringify({ pageId: 'new-1', data: { title: 'Nueva' } })
      });
      
      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.pageId).toBe('new-1');
    });
  });

  describe('PUT Handler', () => {
    it('debe actualizar una landing correctamente', async () => {
      mockAuthenticateCaller.mockResolvedValue({ uid: 'mentor-1', isAdmin: false });
      const req = new NextRequest('http://localhost/api/sales-pages', {
        method: 'PUT',
        body: JSON.stringify({ pageId: 'upd-1', data: { activeUntil: '2027-01-01' } })
      });
      
      const res = await PUT(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.pageId).toBe('upd-1');
    });
  });

  describe('DELETE Handler', () => {
    it('debe devolver 400 si falta pageId', async () => {
      mockAuthenticateCaller.mockResolvedValue({ uid: 'mentor-1', isAdmin: false });
      const req = new NextRequest('http://localhost/api/sales-pages'); // No searchParams
      
      const res = await DELETE(req);
      expect(res.status).toBe(400);
    });

    it('debe borrar una landing correctamente', async () => {
      mockAuthenticateCaller.mockResolvedValue({ uid: 'mentor-1', isAdmin: false });
      const req = new NextRequest('http://localhost/api/sales-pages?pageId=del-1');
      
      const res = await DELETE(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.pageId).toBe('del-1');
    });
  });
});
