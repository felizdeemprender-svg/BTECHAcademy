import { AdminSalesPageRepository } from '@/data/firestore/admin-sales-page-repo';
import type { SalesPage } from '@/domain/catalog';
import {
  checkPendingLimit,
  isAffiliateLanding,
} from '../landing-lifecycle';

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

    const mentorId = request.data.mentorId || request.uid;
    const existingPages = await this.repo.listByMentor(mentorId);

    // Asegurar que el nombre de campaña (title) no esté repetido
    if (request.data.title) {
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

    const targetCourseId = request.data.courseId || request.data.productId;
    const isArchiving = request.data.status === 'archivada';

    // Regla Mandatoria: Ninguna landing se activa automáticamente al crearse.
    // Toda landing nueva nace siempre en estado 'pendiente' (o 'archivada' si se especificó).
    // La activación es un proceso manual explícito posterior con selección de relevo.
    request.data.isActive = false;
    request.data.status = isArchiving ? 'archivada' : 'pendiente';
    request.data.fallbackLandingId = request.data.fallbackLandingId || null;

    if (!isArchiving && targetCourseId) {
      const isAffiliate = isAffiliateLanding(request.data as any);
      const limitCheck = checkPendingLimit(existingPages, targetCourseId, isAffiliate, request.data.referidoId);
      if (limitCheck.isLimitReached) {
        const err: any = new Error(`Límite de 5 landings pendientes alcanzado para este curso.`);
        err.code = 'LIMIT_PENDING_REACHED';
        err.pendingPages = limitCheck.pendingPages.map((p) => ({
          id: p.id,
          title: p.title || 'Sin título',
          price: p.price ?? 0,
        }));
        throw err;
      }
    }

    await this.repo.create(request.pageId, request.data);
  }
}
