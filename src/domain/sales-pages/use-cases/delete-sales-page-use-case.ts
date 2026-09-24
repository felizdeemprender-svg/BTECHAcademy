import { AdminSalesPageRepository } from '@/data/firestore/admin-sales-page-repo';

interface DeleteSalesPageRequest {
  uid: string;
  isAdmin: boolean;
  pageId: string;
}

export class DeleteSalesPageUseCase {
  constructor(private readonly repo: AdminSalesPageRepository) {}

  async execute(request: DeleteSalesPageRequest): Promise<void> {
    const page = await this.repo.getById(request.pageId);
    
    if (!page) {
      throw new Error('SalesPage not found');
    }

    // Validación de seguridad (ownership)
    if (!request.isAdmin && page.mentorId !== request.uid) {
      throw new Error('Unauthorized: You do not own this SalesPage and cannot delete it');
    }

    await this.repo.delete(request.pageId);
  }
}
