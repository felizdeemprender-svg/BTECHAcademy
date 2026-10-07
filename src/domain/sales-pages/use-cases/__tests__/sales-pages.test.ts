import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateSalesPageUseCase } from '../create-sales-page-use-case';
import { UpdateSalesPageUseCase } from '../update-sales-page-use-case';
import { DeleteSalesPageUseCase } from '../delete-sales-page-use-case';
import { AdminSalesPageRepository } from '@/data/firestore/admin-sales-page-repo';
import type { SalesPage } from '@/domain/catalog';

// Mock the repository
vi.mock('@/data/firestore/admin-sales-page-repo');

describe('Sales Pages Use Cases', () => {
  let mockRepo: import('vitest').Mocked<AdminSalesPageRepository>;
  let createUseCase: CreateSalesPageUseCase;
  let updateUseCase: UpdateSalesPageUseCase;
  let deleteUseCase: DeleteSalesPageUseCase;

  beforeEach(() => {
    mockRepo = new AdminSalesPageRepository() as import('vitest').Mocked<AdminSalesPageRepository>;
    createUseCase = new CreateSalesPageUseCase(mockRepo);
    updateUseCase = new UpdateSalesPageUseCase(mockRepo);
    deleteUseCase = new DeleteSalesPageUseCase(mockRepo);
    
    // Clear all mocks before each test
    vi.clearAllMocks();
    mockRepo.listByMentor.mockResolvedValue([]);
  });

  describe('CreateSalesPageUseCase (Clonación/Creación)', () => {
    it('debe permitir a un mentor crear una página a su nombre', async () => {
      mockRepo.getById.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue(undefined);

      await createUseCase.execute({
        uid: 'mentor-123',
        isAdmin: false,
        isMarketing: false,
        pageId: 'page-1',
        data: { mentorId: 'mentor-123', title: 'Mi Promo' }
      });

      expect(mockRepo.create).toHaveBeenCalledWith('page-1', { mentorId: 'mentor-123', title: 'Mi Promo' });
    });

    it('debe rechazar si un mentor intenta crear una página a nombre de otro', async () => {
      await expect(
        createUseCase.execute({
          uid: 'mentor-123',
          isAdmin: false,
          isMarketing: false,
          pageId: 'page-1',
          data: { mentorId: 'mentor-456' } // Otro mentor
        })
      ).rejects.toThrow('Unauthorized: Mentors can only create SalesPages for themselves');
      
      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it('debe rechazar si la landing ya existe (Conflicto de ID)', async () => {
      mockRepo.getById.mockResolvedValue({ id: 'page-1' } as SalesPage);

      await expect(
        createUseCase.execute({
          uid: 'mentor-123',
          isAdmin: false,
          isMarketing: false,
          pageId: 'page-1',
          data: { mentorId: 'mentor-123' }
        })
      ).rejects.toThrow('Conflict: A SalesPage with this ID already exists');
    });

    it('debe permitir a un admin crear una página a nombre de cualquier mentor', async () => {
      mockRepo.getById.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue(undefined);

      await createUseCase.execute({
        uid: 'admin-999',
        isAdmin: true,
        isMarketing: false,
        pageId: 'page-admin',
        data: { mentorId: 'mentor-456' }
      });

      expect(mockRepo.create).toHaveBeenCalledWith('page-admin', { mentorId: 'mentor-456' });
    });
  });

  describe('UpdateSalesPageUseCase (Prórroga/Edición)', () => {
    it('debe permitir a un mentor actualizar su propia landing (ej: prorrogar fecha)', async () => {
      const existingPage = { id: 'page-1', mentorId: 'mentor-123' } as SalesPage;
      mockRepo.getById.mockResolvedValue(existingPage);
      mockRepo.update.mockResolvedValue(undefined);

      const newDate = new Date();
      await updateUseCase.execute({
        uid: 'mentor-123',
        isAdmin: false,
        pageId: 'page-1',
        data: { activeUntil: newDate }
      });

      expect(mockRepo.update).toHaveBeenCalledWith('page-1', { activeUntil: newDate });
    });

    it('debe rechazar si un mentor intenta actualizar la landing de otro', async () => {
      const existingPage = { id: 'page-1', mentorId: 'mentor-456' } as SalesPage; // Dueño es mentor-456
      mockRepo.getById.mockResolvedValue(existingPage);

      await expect(
        updateUseCase.execute({
          uid: 'mentor-123',
          isAdmin: false,
          pageId: 'page-1',
          data: { title: 'Hacked' }
        })
      ).rejects.toThrow('Unauthorized: You do not own this SalesPage');
      
      expect(mockRepo.update).not.toHaveBeenCalled();
    });

    it('debe rechazar si un mentor intenta cambiarse el dueño de la landing', async () => {
      const existingPage = { id: 'page-1', mentorId: 'mentor-123' } as SalesPage;
      mockRepo.getById.mockResolvedValue(existingPage);

      await expect(
        updateUseCase.execute({
          uid: 'mentor-123',
          isAdmin: false,
          pageId: 'page-1',
          data: { mentorId: 'mentor-456' }
        })
      ).rejects.toThrow('Unauthorized: Cannot change the mentorId of this SalesPage');
    });

    it('debe lanzar error si la página a actualizar no existe', async () => {
      mockRepo.getById.mockResolvedValue(null);

      await expect(
        updateUseCase.execute({
          uid: 'mentor-123',
          isAdmin: false,
          pageId: 'page-none',
          data: { title: 'Nuevo' }
        })
      ).rejects.toThrow('SalesPage not found');
    });
  });

  describe('DeleteSalesPageUseCase (Borrado)', () => {
    it('debe permitir a un mentor borrar su propia landing', async () => {
      const existingPage = { id: 'page-1', mentorId: 'mentor-123' } as SalesPage;
      mockRepo.getById.mockResolvedValue(existingPage);
      mockRepo.delete.mockResolvedValue(undefined);

      await deleteUseCase.execute({
        uid: 'mentor-123',
        isAdmin: false,
        pageId: 'page-1'
      });

      expect(mockRepo.delete).toHaveBeenCalledWith('page-1');
    });

    it('debe rechazar si un mentor intenta borrar la landing de otro', async () => {
      const existingPage = { id: 'page-2', mentorId: 'mentor-456' } as SalesPage;
      mockRepo.getById.mockResolvedValue(existingPage);

      await expect(
        deleteUseCase.execute({
          uid: 'mentor-123',
          isAdmin: false,
          pageId: 'page-2'
        })
      ).rejects.toThrow('Unauthorized: You do not own this SalesPage and cannot delete it');
      
      expect(mockRepo.delete).not.toHaveBeenCalled();
    });

    it('debe permitir a un admin borrar cualquier landing', async () => {
      const existingPage = { id: 'page-3', mentorId: 'mentor-456' } as SalesPage;
      mockRepo.getById.mockResolvedValue(existingPage);
      mockRepo.delete.mockResolvedValue(undefined);

      await deleteUseCase.execute({
        uid: 'admin-999',
        isAdmin: true,
        pageId: 'page-3'
      });

      expect(mockRepo.delete).toHaveBeenCalledWith('page-3');
    });
  });
});
