import { AdminSalesPageRepository } from '@/data/firestore/admin-sales-page-repo';
import type { SalesPage } from '@/domain/catalog';

interface CreateSalesPageRequest {
  uid: string;
  isAdmin: boolean;
  isMarketing: boolean;
  pageId: string;
  data: Partial<SalesPage>;
}

export class CreateSalesPageUseCase {
  constructor(private readonly repo: AdminSalesPageRepository) {}

  async execute(request: CreateSalesPageRequest): Promise<void> {
    const isMentor = !request.isAdmin && !request.isMarketing;

    // Si es un mentor creando una página, solo puede crearla a su nombre.
    if (isMentor && request.data.mentorId !== request.uid) {
      throw new Error('Unauthorized: Mentors can only create SalesPages for themselves');
    }

    // Admins o Marketing pueden crear a nombre de cualquiera (o del sistema).
    
    // Verificamos si la página ya existe
    const existing = await this.repo.getById(request.pageId);
    if (existing) {
      throw new Error('Conflict: A SalesPage with this ID already exists');
    }

    // Asegurar que el nombre de campaña (title) no esté repetido
    if (request.data.title) {
      const mentorId = request.data.mentorId || request.uid;
      const existingPages = await this.repo.listByMentor(mentorId);
      const titles = existingPages.map(p => p.title);
      
      if (titles.includes(request.data.title)) {
        let suffix = 1;
        while (titles.includes(`${request.data.title} _${suffix}`)) {
          suffix++;
        }
        request.data.title = `${request.data.title} _${suffix}`;
        if (request.data.slug) {
          request.data.slug = `${request.data.slug}-${suffix}`;
        }
      }
    }

    await this.repo.create(request.pageId, request.data);
  }
}
