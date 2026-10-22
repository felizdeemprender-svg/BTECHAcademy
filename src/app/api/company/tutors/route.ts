import { NextRequest, NextResponse } from 'next/server';
import { authenticateCaller } from '@/lib/api/mentor-auth';
import { FirestoreCompanyRepository } from '@/data/firestore/company-repo';
import { inviteTutorToCompany, mapCompanyPermissionsToMentorPermissions } from '@/domain/company';
import { adminDb } from '@/firebase/admin';

const repo = new FirestoreCompanyRepository();

async function resolveCallerCompanyId(caller: { uid: string; isAdmin: boolean }): Promise<string | null> {
  const company = await repo.findByOwnerId(caller.uid);
  if (company) return company.id;

  const userDoc = await adminDb.collection('users').doc(caller.uid).get();
  return userDoc.data()?.companyId || null;
}

/**
 * GET /api/company/tutors
 * Lista los tutores de la empresa del usuario autenticado.
 */
export async function GET(req: NextRequest) {
  try {
    const caller = await authenticateCaller(req);
    if (!caller) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const requestedCompanyId = req.nextUrl.searchParams.get('companyId');
    const companyId = caller.isAdmin && requestedCompanyId
      ? requestedCompanyId
      : (await resolveCallerCompanyId(caller));
    if (!companyId) {
      return NextResponse.json({ success: false, error: 'Empresa no encontrada' }, { status: 404 });
    }

    const tutors = await repo.listTutors(companyId);
    return NextResponse.json({ success: true, data: tutors });
  } catch (error: any) {
    console.error('[API:Company:Tutors:GET] Error listando tutores:', error);
    return NextResponse.json({ success: false, error: error.message || 'Error del servidor' }, { status: 500 });
  }
}

/**
 * POST /api/company/tutors
 * Invita o vincula un tutor a la empresa del usuario autenticado con control de cuota.
 */
export async function POST(req: NextRequest) {
  try {
    const caller = await authenticateCaller(req);
    if (!caller) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

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

    // Solo el owner de la empresa o superadmin puede dar de alta tutores
    if (!caller.isAdmin && company.ownerId !== caller.uid) {
      return NextResponse.json({ success: false, error: 'Acceso denegado: solo el titular de la empresa puede dar de alta tutores' }, { status: 403 });
    }

    const email = (body.email || '').trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ success: false, error: 'Email de tutor requerido' }, { status: 400 });
    }

    // Regla de Negocio: La plataforma opera sobre el ecosistema Google (@gmail.com / @googlemail.com)
    if (!email.endsWith('@gmail.com') && !email.endsWith('@googlemail.com')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Por políticas de autenticación y seguridad de la plataforma, la vinculación de tutores opera exclusivamente con cuentas del ecosistema Google (@gmail.com).',
        },
        { status: 400 },
      );
    }

    // Regla de Negocio: No se permite anexar tutores ya dados de alta en el sistema o en otra empresa
    try {
      const existingUserSnap = await adminDb
        .collection('users')
        .where('email', '==', email)
        .limit(1)
        .get();

      if (!existingUserSnap.empty) {
        return NextResponse.json(
          {
            success: false,
            error: `El correo "${email}" ya se encuentra registrado en el sistema. Por política de exclusividad empresarial, no está permitido anexar usuarios o tutores ya dados de alta; únicamente se admiten cuentas nuevas para la empresa.`,
          },
          { status: 409 },
        );
      }
    } catch (checkErr: any) {
      console.warn('[API:Company:Tutors:POST] Error verificando usuario existente:', checkErr?.message);
    }

    try {
      if (typeof adminDb.collectionGroup === 'function') {
        const existingTutorGroupSnap = await adminDb
          .collectionGroup('tutors')
          .where('email', '==', email)
          .limit(1)
          .get();

        if (!existingTutorGroupSnap.empty) {
          return NextResponse.json(
            {
              success: false,
              error: `El docente "${email}" ya pertenece o está vinculado a otra empresa. No es posible anexar tutores vinculados a otras organizaciones.`,
            },
            { status: 409 },
          );
        }
      }
    } catch (groupErr: any) {
      // Ignorar si collectionGroup no está soportado o no tiene índice
    }

    // Validar que los roles solicitados por la empresa sean únicamente 'mentor' y/o 'marketing'
    const rawRoles: string[] = Array.isArray(body.roles) && body.roles.length > 0 ? body.roles : ['mentor'];
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
    const requestedRoles = rawRoles as ('mentor' | 'marketing')[];

    const tutorId = body.tutorId || `tutor_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const result = await inviteTutorToCompany(repo, {
      companyId,
      tutorId,
      email,
      displayName: body.displayName,
      roles: requestedRoles,
      permissions: body.permissions,
    });

    if (!result.ok) {
      const status =
        result.error.code === 'FORBIDDEN'
          ? 403
          : result.error.code === 'CONFLICT'
            ? 409
            : result.error.code === 'NOT_FOUND'
              ? 404
              : 400;
      return NextResponse.json({ success: false, error: result.error.message }, { status });
    }

    const calculatedMentorPermissions = mapCompanyPermissionsToMentorPermissions(
      requestedRoles,
      result.value.permissions
    );

    // Vincular al usuario en Firestore (actualiza documento directo y por email si existiera)
    const userUpdate = {
      email,
      displayName: body.displayName,
      companyId,
      companyName: company.name,
      companyRole: 'tutor',
      roles: requestedRoles,
      isMentor: requestedRoles.includes('mentor'),
      mentorPermissions: calculatedMentorPermissions,
      updatedAt: new Date(),
    };
    await adminDb.collection('users').doc(tutorId).set(userUpdate, { merge: true });

    try {
      const emailSnap = await adminDb.collection('users').where('email', '==', email).get();
      for (const d of emailSnap.docs) {
        if (d.id !== tutorId) {
          await d.ref.set(userUpdate, { merge: true });
        }
      }
    } catch (e) {
      console.warn('[API:Company:Tutors:POST] Error actualizando doc por email:', e);
    }

    return NextResponse.json({ success: true, data: result.value }, { status: 201 });
  } catch (error: any) {
    console.error('[API:Company:Tutors:POST] Error vinculando tutor:', error);
    return NextResponse.json({ success: false, error: error.message || 'Error del servidor' }, { status: 500 });
  }
}
