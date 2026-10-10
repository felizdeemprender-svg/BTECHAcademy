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
    let page = await this.repo.getById(request.pageId);
    let isVirtualCampaign = false;
    
    if (!page) {
      // Intentar cargar la campaña para emular el Pack Multimedia virtual
      const { adminDb } = await import('@/firebase/admin');
      const campRef = await adminDb.collection('campaigns').doc(request.pageId).get();
      if (!campRef.exists) {
        throw new Error('SalesPage not found');
      }
      isVirtualCampaign = true;
      const camp = campRef.data() as any;
      page = {
        id: camp.id || request.pageId,
        mentorId: camp.mentorId,
        type: 'campaign_pack',
        title: camp.name || camp.title || 'Pack Multimedia (Virtual)',
        aiContent: { socials: camp.videoSkeletons || [] },
        campaignStatus: camp.productionStatus,
      } as any;
    }

    // Validación de seguridad (ownership)
    if (!request.isAdmin && page!.mentorId !== request.uid) {
      throw new Error('Unauthorized: You do not own this SalesPage');
    }

    // No permitir cambiar de dueño a menos que sea Admin (opcional, pero buena práctica)
    if (request.data.mentorId && request.data.mentorId !== page!.mentorId && !request.isAdmin) {
      throw new Error('Unauthorized: Cannot change the mentorId of this SalesPage');
    }

    // Asegurar que el nombre de campaña (title) no esté repetido
    if (request.data.title && request.data.title !== page!.title) {
      const existingPages = await this.repo.listByMentor(page!.mentorId);
      const titles = existingPages.filter(p => p.id !== request.pageId).map(p => p.title);
      
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

    // MERGE production_notes para evitar sobreescribir los links de video generados en background
    if (request.data.aiContent?.socials && page!.aiContent?.socials) {
      const existingSocials = page!.aiContent.socials as any[];
      const incomingSocials = request.data.aiContent.socials as any[];
      
      request.data.aiContent.socials = incomingSocials.map(inc => {
        // Buscar el social equivalente en la base de datos (por marketingName y platform)
        const exist = existingSocials.find(e => e.marketingName === inc.marketingName && e.platform === inc.platform);
        if (exist && exist.production_notes) {
          // Mantener los links generados en background si la UI los manda vacíos
          const mergedNotes = { ...exist.production_notes, ...(inc.production_notes || {}) };
          if (exist.production_notes.video_url && !inc.production_notes?.video_url) {
            mergedNotes.video_url = exist.production_notes.video_url;
            mergedNotes.video_drive_id = exist.production_notes.video_drive_id;
            mergedNotes.video_download_url = exist.production_notes.video_download_url;
          }
          return { ...inc, production_notes: mergedNotes };
        }
        return inc;
      });

      // Set isGenerated if video is present, but DO NOT auto-clear isDraft.
      // Approval must be done explicitly via UI.
      if (request.data.aiContent?.socials) {
        request.data.aiContent.socials = request.data.aiContent.socials.map((s: any) => {
          if (s.production_notes?.video_url) {
            s.isGenerated = true;
          }
          return s;
        });
      }

      // Check progress of videos
      const socials = request.data.aiContent.socials;
      const totalVideos = socials.length;
      const sealedVideos = socials.filter((s: any) => s.production_notes?.isLocked).length;
      
      if (totalVideos > 0 && sealedVideos === totalVideos) {
        request.data.campaignStatus = 'ready_to_publish';
      } else {
        request.data.campaignStatus = 'drafts_ready';
      }
    }

    if (!isVirtualCampaign) {
      await this.repo.update(request.pageId, request.data);
    }

    // Sync with Campaign in Firestore to update progress and state machine
    try {
      const { adminDb } = await import('@/firebase/admin');
      
      let campaignsSnap;
      if (isVirtualCampaign) {
        // La request.pageId ES la campaña
        const doc = await adminDb.collection('campaigns').doc(request.pageId).get();
        campaignsSnap = { empty: !doc.exists, docs: doc.exists ? [doc] : [] };
      } else {
        campaignsSnap = await adminDb.collection('campaigns')
          .where('salesPageId', '==', request.pageId)
          .get();
      }
      
      if (!campaignsSnap.empty) {
        const socialsForSync = request.data.aiContent?.socials || page!.aiContent?.socials || [];
        const total = socialsForSync.length;
        const sealed = socialsForSync.filter((s: any) => s.production_notes?.isLocked).length;
        
        const isAllSealed = total > 0 && sealed === total;
        
        const batch = adminDb.batch();
        campaignsSnap.docs.forEach(doc => {
          const docData = doc.data() || {};
          const updates: any = { 
            progress: { sealed, total },
            updatedAt: new Date() 
          };

          if (isVirtualCampaign && request.data.aiContent?.socials) {
            updates.videoSkeletons = request.data.aiContent.socials;
            updates.productionStatus = isAllSealed ? 'sealed' : 'producing';
          }
          
          if (isAllSealed) {
            updates.productionStatus = 'sealed';
            // Only upgrade to ready_for_distribution if it hasn't progressed further
            if (docData.status === 'draft') {
              updates.status = 'ready_for_distribution';
            }
          } else {
            // Revert back if unsealed
            updates.productionStatus = 'producing';
            if (docData.status === 'ready_for_distribution') {
              updates.status = 'draft';
            }
          }
          
          batch.update(doc.ref, updates);
        });
        await batch.commit();
      }
    } catch (err) {
      console.error('Error sync Campaign productionStatus & cleanup:', err);
    }
  }
}
