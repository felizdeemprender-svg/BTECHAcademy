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

    const page = await repo.getById(id);
    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    // SI es un pack de campaña, buscar el contenido de IA real alojado en su orquestador (colección campaigns)
    if (page.type === 'campaign_pack' || (page.type as any) === 'campaign_videos' || (page.type as any) === 'multimedia_pack') {
      const { adminDb } = await import('@/firebase/admin');
      const campSnap = await adminDb.collection('campaigns')
        .where('salesPageId', '==', page.id)
        .limit(1)
        .get();
      if (!campSnap.empty) {
        const campData = campSnap.docs[0].data();
        if (campData.aiContent?.socials) {
          page.aiContent = { ...page.aiContent, socials: campData.aiContent.socials };
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
