import { NextRequest, NextResponse } from 'next/server';
import { authenticateCaller } from '@/lib/api/mentor-auth';
import { FirestoreAvatarRepository } from '@/data/firestore/avatar-repo';
import { AvatarSchema } from '@/domain/avatars';

const repo = new FirestoreAvatarRepository();

/**
 * GET /api/avatars
 * Lista los avatares del usuario autenticado (ejecuta auto-seed si la cuenta es nueva).
 */
export async function GET(req: NextRequest) {
  try {
    const caller = await authenticateCaller(req);
    if (!caller) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const requestedUserId = req.nextUrl.searchParams.get('userId');
    const targetUserId = caller.isAdmin && requestedUserId ? requestedUserId : caller.uid;

    const avatars = await repo.listByUser(targetUserId);
    return NextResponse.json({ success: true, data: avatars });
  } catch (error: any) {
    console.error('[API:Avatars:GET] Error listando avatares:', error);
    return NextResponse.json({ success: false, error: error.message || 'Error del servidor' }, { status: 500 });
  }
}

/**
 * POST /api/avatars
 * Crea un nuevo avatar o clona uno existente para el usuario autenticado.
 */
export async function POST(req: NextRequest) {
  try {
    const caller = await authenticateCaller(req);
    if (!caller) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const targetUserId = caller.isAdmin && body.userId ? body.userId : caller.uid;

    const id = body.id || `avatar_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const validated = AvatarSchema.parse({
      ...body,
      id,
      userId: targetUserId,
    });

    const saved = await repo.save(targetUserId, validated);
    return NextResponse.json({ success: true, data: saved }, { status: 201 });
  } catch (error: any) {
    console.error('[API:Avatars:POST] Error creando avatar:', error);
    return NextResponse.json({ success: false, error: error.message || 'Error del servidor' }, { status: 400 });
  }
}

/**
 * PUT /api/avatars
 * Actualiza los datos de un avatar existente.
 */
export async function PUT(req: NextRequest) {
  try {
    const caller = await authenticateCaller(req);
    if (!caller) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json();
    if (!body.id) {
      return NextResponse.json({ success: false, error: 'Falta el ID del avatar a actualizar' }, { status: 400 });
    }

    const targetUserId = caller.isAdmin && body.userId ? body.userId : caller.uid;
    const validated = AvatarSchema.parse({
      ...body,
      userId: targetUserId,
    });

    const updated = await repo.save(targetUserId, validated);
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('[API:Avatars:PUT] Error actualizando avatar:', error);
    return NextResponse.json({ success: false, error: error.message || 'Error del servidor' }, { status: 400 });
  }
}

/**
 * DELETE /api/avatars?id=...
 * Elimina un avatar (impide borrar el único avatar restante).
 */
export async function DELETE(req: NextRequest) {
  try {
    const caller = await authenticateCaller(req);
    if (!caller) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    let avatarId = req.nextUrl.searchParams.get('id');
    if (!avatarId) {
      const body = await req.json().catch(() => ({}));
      avatarId = body?.id;
    }

    if (!avatarId) {
      return NextResponse.json({ success: false, error: 'Falta el ID del avatar a eliminar' }, { status: 400 });
    }

    const requestedUserId = req.nextUrl.searchParams.get('userId');
    const targetUserId = caller.isAdmin && requestedUserId ? requestedUserId : caller.uid;

    const result = await repo.delete(targetUserId, avatarId);
    return NextResponse.json({ success: true, message: 'Avatar eliminado correctamente', ...result });
  } catch (error: any) {
    console.error('[API:Avatars:DELETE] Error eliminando avatar:', error);
    return NextResponse.json({ success: false, error: error.message || 'Error del servidor' }, { status: 400 });
  }
}
