import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateSalesPageUseCase } from '../update-sales-page-use-case';
import { AdminSalesPageRepository } from '@/data/firestore/admin-sales-page-repo';

describe('UpdateSalesPageUseCase', () => {
  let mockRepo: any;
  let useCase: UpdateSalesPageUseCase;

  beforeEach(() => {
    mockRepo = {
      getById: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    } as any;
    useCase = new UpdateSalesPageUseCase(mockRepo);
  });

  it('debe fallar si la página no existe', async () => {
    vi.mocked(mockRepo.getById).mockResolvedValue(null);
    
    await expect(
      useCase.execute({
        uid: 'user_1',
        isAdmin: false,
        pageId: 'page_1',
        data: { title: 'Nuevo Título' },
      })
    ).rejects.toThrow('SalesPage not found');
  });

  it('debe fallar si un mentor intenta actualizar la página de OTRO mentor', async () => {
    vi.mocked(mockRepo.getById).mockResolvedValue({
      id: 'page_1',
      mentorId: 'mentor_A',
    } as any);

    await expect(
      useCase.execute({
        uid: 'mentor_B', // Diferente al dueño
        isAdmin: false,
        pageId: 'page_1',
        data: { title: 'Hacked' },
      })
    ).rejects.toThrow('Unauthorized: You do not own this SalesPage');

    expect(mockRepo.update).not.toHaveBeenCalled();
  });

  it('debe pasar si un mentor actualiza su PROPIA página', async () => {
    vi.mocked(mockRepo.getById).mockResolvedValue({
      id: 'page_1',
      mentorId: 'mentor_A',
    } as any);

    await useCase.execute({
      uid: 'mentor_A', // Dueño legítimo
      isAdmin: false,
      pageId: 'page_1',
      data: { title: 'Legit' },
    });

    expect(mockRepo.update).toHaveBeenCalledWith('page_1', { title: 'Legit' });
  });

  it('debe fallar si un mentor intenta cambiar el mentorId de su propia página', async () => {
    vi.mocked(mockRepo.getById).mockResolvedValue({
      id: 'page_1',
      mentorId: 'mentor_A',
    } as any);

    await expect(
      useCase.execute({
        uid: 'mentor_A',
        isAdmin: false,
        pageId: 'page_1',
        data: { mentorId: 'mentor_B' }, // Intento de transferencia no autorizado
      })
    ).rejects.toThrow('Unauthorized: Cannot change the mentorId of this SalesPage');
  });

  it('debe pasar si un ADMIN actualiza la página de cualquier mentor', async () => {
    vi.mocked(mockRepo.getById).mockResolvedValue({
      id: 'page_1',
      mentorId: 'mentor_A',
    } as any);

    await useCase.execute({
      uid: 'admin_1',
      isAdmin: true, // Es admin
      pageId: 'page_1',
      data: { title: 'Admin Override' },
    });

    expect(mockRepo.update).toHaveBeenCalledWith('page_1', { title: 'Admin Override' });
  });

  it('debe pasar si un ADMIN cambia el mentorId', async () => {
    vi.mocked(mockRepo.getById).mockResolvedValue({
      id: 'page_1',
      mentorId: 'mentor_A',
    } as any);

    await useCase.execute({
      uid: 'admin_1',
      isAdmin: true, // Es admin
      pageId: 'page_1',
      data: { mentorId: 'mentor_B' }, // Transferencia autorizada
    });

    expect(mockRepo.update).toHaveBeenCalledWith('page_1', { mentorId: 'mentor_B' });
  });
});
