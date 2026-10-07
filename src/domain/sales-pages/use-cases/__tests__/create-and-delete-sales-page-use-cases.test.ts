import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateSalesPageUseCase } from '../create-sales-page-use-case';
import { DeleteSalesPageUseCase } from '../delete-sales-page-use-case';
import { AdminSalesPageRepository } from '@/data/firestore/admin-sales-page-repo';

describe('Create & Delete SalesPage Use Cases', () => {
  let mockRepo: any;

  beforeEach(() => {
    mockRepo = {
      getById: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      listByMentor: vi.fn().mockResolvedValue([]),
    } as any;
  });

  describe('CreateSalesPageUseCase', () => {
    let useCase: CreateSalesPageUseCase;
    
    beforeEach(() => {
      useCase = new CreateSalesPageUseCase(mockRepo);
    });

    it('debe fallar si la página ya existe', async () => {
      vi.mocked(mockRepo.getById).mockResolvedValue({ id: 'page_1', mentorId: 'mentor_A' } as any);
      
      await expect(
        useCase.execute({
          uid: 'mentor_A',
          isAdmin: false,
          isMarketing: false,
          pageId: 'page_1',
          data: { mentorId: 'mentor_A', title: 'Nueva Landing' },
        })
      ).rejects.toThrow('Conflict: A SalesPage with this ID already exists');
    });

    it('debe fallar si un mentor intenta crear una página para OTRO mentor', async () => {
      vi.mocked(mockRepo.getById).mockResolvedValue(null);
      
      await expect(
        useCase.execute({
          uid: 'mentor_A',
          isAdmin: false,
          isMarketing: false,
          pageId: 'page_2',
          data: { mentorId: 'mentor_B', title: 'Hack' },
        })
      ).rejects.toThrow('Unauthorized: Mentors can only create SalesPages for themselves');
    });

    it('debe pasar si un mentor crea su propia página', async () => {
      vi.mocked(mockRepo.getById).mockResolvedValue(null);
      
      await useCase.execute({
        uid: 'mentor_A',
        isAdmin: false,
        isMarketing: false,
        pageId: 'page_2',
        data: { mentorId: 'mentor_A', title: 'Mi Landing' },
      });

      expect(mockRepo.create).toHaveBeenCalledWith('page_2', { mentorId: 'mentor_A', title: 'Mi Landing' });
    });

    it('debe pasar si un ADMIN crea una página para cualquier mentor', async () => {
      vi.mocked(mockRepo.getById).mockResolvedValue(null);
      
      await useCase.execute({
        uid: 'admin_1',
        isAdmin: true,
        isMarketing: false,
        pageId: 'page_3',
        data: { mentorId: 'mentor_X', title: 'Landing Admin' },
      });

      expect(mockRepo.create).toHaveBeenCalledWith('page_3', { mentorId: 'mentor_X', title: 'Landing Admin' });
    });
  });

  describe('DeleteSalesPageUseCase', () => {
    let useCase: DeleteSalesPageUseCase;
    
    beforeEach(() => {
      useCase = new DeleteSalesPageUseCase(mockRepo);
    });

    it('debe fallar si la página no existe', async () => {
      vi.mocked(mockRepo.getById).mockResolvedValue(null);
      
      await expect(
        useCase.execute({
          uid: 'mentor_A',
          isAdmin: false,
          pageId: 'page_1'
        })
      ).rejects.toThrow('SalesPage not found');
    });

    it('debe fallar si un mentor intenta borrar la página de OTRO mentor', async () => {
      vi.mocked(mockRepo.getById).mockResolvedValue({ id: 'page_1', mentorId: 'mentor_A' } as any);
      
      await expect(
        useCase.execute({
          uid: 'mentor_B',
          isAdmin: false,
          pageId: 'page_1'
        })
      ).rejects.toThrow('Unauthorized: You do not own this SalesPage and cannot delete it');
    });

    it('debe pasar si un mentor borra su propia página', async () => {
      vi.mocked(mockRepo.getById).mockResolvedValue({ id: 'page_1', mentorId: 'mentor_A' } as any);
      
      await useCase.execute({
        uid: 'mentor_A',
        isAdmin: false,
        pageId: 'page_1'
      });

      expect(mockRepo.delete).toHaveBeenCalledWith('page_1');
    });
  });
});
