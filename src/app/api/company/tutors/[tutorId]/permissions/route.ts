import { NextRequest, NextResponse } from 'next/server';
import { authenticateCaller } from '@/lib/api/mentor-auth';
import { FirestoreCompanyRepository } from '@/data/firestore/company-repo';
import { updateTutorPermissions, mapCompanyPermissionsToMentorPermissions } from '@/domain/company';
import { adminDb } from '@/firebase/admin';

const repo = new FirestoreCompanyRepository();

async function resolveCallerCompanyId(caller: { uid: string; isAdmin: boolean }): Promise<string | null> {
  const company = await repo.findByOwnerId(caller.uid);
  if (company) return company.id;

  const userDoc = await adminDb.collection('users').doc(caller.uid).get();
  return userDoc.data()?.companyId || null;
}

/**
 * PUT /api/company/tutors/[tutorId]/permissions
 * Actualiza las potestades granulares del tutor.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ tutorId: string }> },
) {
  try {
    const caller = await authenticateCaller(req);
    if (!caller) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const { tutorId } = await params;
    const body = await req.json();
    const companyId = caller.isAdmin && body.companyId
      ? body.companyId
      : (await resolveCallerCompanyId(caller));

    if (!companyId) {
      return NextResponse.json({ success: false, error: 'Empresa no encontrada' }, { status: 404 });
    }

    const company = await repo.findById(companyId);
    if (!company) {
      return NextResponse.json({ success: false, error: 'Empresa no encontrada' }, { status: 404 });
    }

    if (!caller.isAdmin && company.ownerId !== caller.uid) {
      return NextResponse.json({ success: false, error: 'Acceso denegado: solo el titular de la empresa puede modificar permisos' }, { status: 403 });
    }

    let requestedRoles: ('mentor' | 'marketing')[] | undefined;
    if (body.roles) {
      const rawRoles: string[] = Array.isArray(body.roles) ? body.roles : [body.roles];
      const invalidRoles = rawRoles.filter((r) => r !== 'mentor' && r !== 'marketing');
      if (invalidRoles.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: `Acceso denegado: La empresa solo tiene potestad para otorgar los roles 'mentor' y 'marketing'. No está permitido otorgar los roles: ${invalidRoles.join(', ')}.`,
          },
          { status: 403 },
        );
      }
      requestedRoles = rawRoles as ('mentor' | 'marketing')[];
    }

    const requestedStatus = body.status === 'active' || body.status === 'suspended' ? body.status : undefined;

    const result = await updateTutorPermissions(repo, {
      companyId,
      tutorId,
      permissions: body.permissions,
      roles: requestedRoles,
      status: requestedStatus,
    });

    if (!result.ok) {
      const status = result.error.code === 'NOT_FOUND' ? 404 : 400;
      return NextResponse.json({ success: false, error: result.error.message }, { status });
    }

    const finalRoles = requestedRoles || result.value?.roles || ['mentor'];
    const finalPermissions = result.value?.permissions;
    const calculatedMentorPermissions = mapCompanyPermissionsToMentorPermissions(finalRoles, finalPermissions);

    const userUpdate: Record<string, any> = {
      updatedAt: new Date(),
      mentorPermissions: calculatedMentorPermissions,
    };
    if (requestedRoles) {
      userUpdate.roles = requestedRoles;
      userUpdate.isMentor = requestedRoles.includes('mentor');
    }
    if (requestedStatus) {
      userUpdate.isActive = requestedStatus === 'active';
    }
    await adminDb.collection('users').doc(tutorId).set(userUpdate, { merge: true });

    if (result.value?.email) {
      try {
        const snap = await adminDb.collection('users').where('email', '==', result.value.email.toLowerCase().trim()).get();
        for (const d of snap.docs) {
          if (d.id !== tutorId) {
            await d.ref.set(userUpdate, { merge: true });
          }
        }
      } catch (err) {
        console.warn('[API:Company:Permissions:PUT] Error replicando update a UID:', err);
      }
    }

    return NextResponse.json({ success: true, data: result.value });
  } catch (error: any) {
    console.error('[API:Company:Permissions:PUT] Error actualizando permisos:', error);
    return NextResponse.json({ success: false, error: error.message || 'Error del servidor' }, { status: 500 });
  }
}

/**
 * DELETE /api/company/tutors/[tutorId]/permissions
 * Desvincula a un tutor de la empresa y libera el cupo del abono.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ tutorId: string }> },
) {
  try {
    const caller = await authenticateCaller(req);
    if (!caller) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const { tutorId } = await params;
    const requestedCompanyId = req.nextUrl.searchParams.get('companyId');
    const companyId = caller.isAdmin && requestedCompanyId
      ? requestedCompanyId
      : (await resolveCallerCompanyId(caller));

    if (!companyId) {
      return NextResponse.json({ success: false, error: 'Empresa no encontrada' }, { status: 404 });
    }

    const company = await repo.findById(companyId);
    if (!company) {
      return NextResponse.json({ success: false, error: 'Empresa no encontrada' }, { status: 404 });
    }

    if (!caller.isAdmin && company.ownerId !== caller.uid) {
      return NextResponse.json({ success: false, error: 'Acceso denegado: solo el titular de la empresa puede desvincular tutores' }, { status: 403 });
    }

    const existingBinding = await repo.getTutorBinding(companyId, tutorId);
    if (!existingBinding) {
      return NextResponse.json({ success: false, error: 'Tutor no vinculado a esta empresa' }, { status: 404 });
    }

    await repo.removeTutorBinding(companyId, tutorId);

    // Reducir contador de tutores activos
    const currentCount = company.subscription.currentUsage.tutorsCount;
    await repo.updateUsage(companyId, {
      tutorsCount: Math.max(0, currentCount - 1),
    });

    // Desvincular companyId en el usuario
    await adminDb.collection('users').doc(tutorId).update({
      companyId: null,
      companyRole: null,
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true, message: 'Tutor desvinculado con éxito' });
  } catch (error: any) {
    console.error('[API:Company:Permissions:DELETE] Error desvinculando tutor:', error);
    return NextResponse.json({ success: false, error: error.message || 'Error del servidor' }, { status: 500 });
  }
}
