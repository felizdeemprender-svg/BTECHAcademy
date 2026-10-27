import { AdminSalesPageRepository } from '@/data/firestore/admin-sales-page-repo';

interface DeleteSalesPageRequest {
  uid: string;
  isAdmin: boolean;
  pageId: string;
  companyId?: string;
  callerRole?: string;
}

export class DeleteSalesPageUseCase {
  constructor(private readonly repo: AdminSalesPageRepository) {}

  async execute(request: DeleteSalesPageRequest): Promise<void> {
    const page = await this.repo.getById(request.pageId);
    
    if (!page) {
      throw new Error('SalesPage not found');
    }

    // Validación de seguridad (ownership: Admin, mentor dueño o empresa titular)
    const isDirectOwner = page.mentorId === request.uid;
    const isCompanyOwner =
      (request.callerRole === 'empresa' || request.callerRole === 'supervisor') &&
      Boolean(page.companyId && (page.companyId === request.companyId || page.companyId === request.uid));

    if (!request.isAdmin && !isDirectOwner && !isCompanyOwner) {
      throw new Error('Unauthorized: You do not own this SalesPage and cannot delete it');
    }

    // Se permite el borrado de landings tipo campaign_pack porque el orquestador 
    // solo las toma como referencia, según reglas de negocio.

    await this.repo.delete(request.pageId);
  }
}
