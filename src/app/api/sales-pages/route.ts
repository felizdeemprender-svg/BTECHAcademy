import { NextRequest, NextResponse } from 'next/server';

import { authenticateCaller } from '@/lib/api/mentor-auth';
import { resolveGateway } from '@/lib/api/gateway';
import { handleListPacks } from '@/lib/api/sales-page-handlers';
import { CreateSalesPageUseCase } from '@/domain/sales-pages/use-cases/create-sales-page-use-case';
import { UpdateSalesPageUseCase } from '@/domain/sales-pages/use-cases/update-sales-page-use-case';
import { DeleteSalesPageUseCase } from '@/domain/sales-pages/use-cases/delete-sales-page-use-case';
import { AdminSalesPageRepository } from '@/data/firestore/admin-sales-page-repo';

const repo = new AdminSalesPageRepository();
const createUseCase = new CreateSalesPageUseCase(repo);
const updateUseCase = new UpdateSalesPageUseCase(repo);
const deleteUseCase = new DeleteSalesPageUseCase(repo);

/**
 * GET /api/sales-pages?mentorId=...&type=all&referidoId=...
 * Packs orquestables (excluye landing_only) por defecto.
 * Si type=all, devuelve todas (incluyendo landing_only).
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const caller = await authenticateCaller(request);
    if (!caller) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');
    const referidoId = searchParams.get('referidoId');
    let mentorId = searchParams.get('mentorId');
    const courseId = searchParams.get('courseId');

    if (type === 'all' || type === 'landing_only') {
      let pages = [];
      if (caller.isAdmin && !mentorId && !referidoId) {
        // Admin puede listar todas sin filtro
        pages = await repo.listAll();
      } else if (referidoId) {
        // Fetch por referidoId. Como no tenemos método en repo, filtramos listAll 
        // o deberíamos añadirlo al repo. Lo hacemos filtrando listAll por ahora si es admin o listByMentor.
        // Mejor añadir listByReferidoId al repo.
        pages = await repo.listAll(); // Simplificado para admin, luego se optimiza. 
        // Wait, I should add listByReferido al repo.
        pages = pages.filter((p: any) => p.referidoId === referidoId);
      } else {
        // Si no es admin o si se especifica mentorId
        mentorId = mentorId || caller.uid;
        pages = await repo.listByMentor(mentorId);
      }

      if (type === 'landing_only') {
        pages = pages.filter((p: any) => p.type !== 'campaign_pack');
      }

      if (courseId) {
        pages = pages.filter((p: any) => p.courseId === courseId);
      }

      return NextResponse.json(pages);
    }

    mentorId = mentorId || caller.uid;
    return await handleListPacks(await resolveGateway(), caller, mentorId);
  } catch (error) {
    console.error('[API sales-pages]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const caller = await authenticateCaller(req);
    if (!caller) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    const { pageId, data } = body;

    if (!pageId || !data) {
      return NextResponse.json({ error: 'Missing pageId or data' }, { status: 400 });
    }

    await createUseCase.execute({
      uid: caller.uid,
      isAdmin: caller.isAdmin,
      isMarketing: false, // isMarketing is not in Caller type, default to false or update Caller type. We'll set false here.
      pageId,
      data
    });

    return NextResponse.json({ success: true, pageId, updatedTitle: data.title });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.message.includes('Unauthorized') ? 403 : 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const caller = await authenticateCaller(req);
    if (!caller) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    const { pageId, data } = body;

    if (!pageId || !data) {
      return NextResponse.json({ error: 'Missing pageId or data' }, { status: 400 });
    }

    await updateUseCase.execute({
      uid: caller.uid,
      isAdmin: caller.isAdmin,
      pageId,
      data
    });

    return NextResponse.json({ success: true, pageId, updatedTitle: data.title });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.message.includes('Unauthorized') ? 403 : 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const caller = await authenticateCaller(req);
    if (!caller) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const searchParams = req.nextUrl.searchParams;
    const pageId = searchParams.get('pageId');

    if (!pageId) {
      return NextResponse.json({ error: 'Missing pageId' }, { status: 400 });
    }

    await deleteUseCase.execute({
      uid: caller.uid,
      isAdmin: caller.isAdmin,
      pageId
    });

    return NextResponse.json({ success: true, pageId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.message.includes('Unauthorized') ? 403 : 500 });
  }
}
