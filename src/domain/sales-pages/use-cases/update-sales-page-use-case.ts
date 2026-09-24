import { AdminSalesPageRepository } from '@/data/firestore/admin-sales-page-repo';
import type { SalesPage } from '@/domain/catalog';

interface UpdateSalesPageRequest {
  uid: string;
  isAdmin: boolean;
  pageId: string;
  data: Partial<SalesPage>;
}

export class UpdateSalesPageUseCase {
  constructor(private readonly repo: AdminSalesPageRepository) {}

  async execute(request: UpdateSalesPageRequest): Promise<void> {
    const page = await this.repo.getById(request.pageId);
    
    if (!page) {
      throw new Error('SalesPage not found');
    }

    // Validación de seguridad (ownership)
    if (!request.isAdmin && page.mentorId !== request.uid) {
      throw new Error('Unauthorized: You do not own this SalesPage');
    }

    // No permitir cambiar de dueño a menos que sea Admin (opcional, pero buena práctica)
    if (request.data.mentorId && request.data.mentorId !== page.mentorId && !request.isAdmin) {
      throw new Error('Unauthorized: Cannot change the mentorId of this SalesPage');
    }

    await this.repo.update(request.pageId, request.data);
  }
}
