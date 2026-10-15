import { NextRequest, NextResponse } from 'next/server';
import { authenticateCaller } from '@/lib/api/mentor-auth';
import { AdminSalesPageRepository } from '@/data/firestore/admin-sales-page-repo';

const repo = new AdminSalesPageRepository();

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const caller = await authenticateCaller(req);
    if (!caller) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    let page = await repo.getById(id);
    
    if (!page) {
      // Mock Virtual Campaign Pack
      const { adminDb } = await import('@/firebase/admin');
      const campRef = await adminDb.collection('campaigns').doc(id).get();
      if (campRef.exists) {
        const camp = campRef.data() as any;
        const socials = (camp.aiContent?.socials && camp.aiContent.socials.length > 0)
          ? camp.aiContent.socials
          : (camp.videoSkeletons || []);

        page = {
          id: camp.id || id,
          mentorId: camp.mentorId,
          type: 'campaign_pack',
          title: camp.title || camp.name || 'Pack Multimedia (Virtual)',
          courseId: camp.courseId || camp.salesPageId || null,
          salesPageId: camp.salesPageId || null,
          targetAudience: camp.targetAudience || camp.campaignStrategy?.targetAudience || '',
          engineMeta: {
            mission: camp.campaignMission || camp.mission || camp.strategy?.mission || 'venta',
            blueprintId: 'manual',
            sourceApp: 'FastoriaAcademy'
          },
          aiContent: {
            socials,
            ...(camp.aiContent || {})
          },
          campaignStatus: camp.campaignStatus || camp.productionStatus,
          strategy: camp.strategy,
          campaignStrategy: camp.campaignStrategy,
        } as any;
      }
    }

    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    // SI es un pack de campaña, buscar el contenido de IA real alojado en su orquestador (colección campaigns)
    if (page.type === 'campaign_pack' || (page.type as any) === 'campaign_videos' || (page.type as any) === 'multimedia_pack') {
      const { adminDb } = await import('@/firebase/admin');
      // Si la página proviene directamente de campaigns (virtual pack), ya contiene el contenido real.
      // Si es un documento de salesPages, buscar en campaigns por salesPageId o por id de campaña.
      const campDoc = await adminDb.collection('campaigns').doc(page.id).get();
      if (campDoc.exists) {
        const campData = campDoc.data() as any;
        const socials = (campData.aiContent?.socials && campData.aiContent.socials.length > 0)
          ? campData.aiContent.socials
          : (campData.videoSkeletons || []);
        if (socials.length > 0) {
          page.aiContent = { ...page.aiContent, socials };
        }
      } else {
        const campSnap = await adminDb.collection('campaigns')
          .where('salesPageId', '==', page.id)
          .limit(1)
          .get();
        if (!campSnap.empty) {
          const campData = campSnap.docs[0].data();
          const socials = (campData.aiContent?.socials && campData.aiContent.socials.length > 0)
            ? campData.aiContent.socials
            : (campData.videoSkeletons || []);
          if (socials.length > 0) {
            page.aiContent = { ...page.aiContent, socials };
          }
        }
      }
    }

    // Check permissions
    if (!caller.isAdmin && page.mentorId !== caller.uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(page);
  } catch (error) {
    console.error('[API GET sales-page by id]', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
