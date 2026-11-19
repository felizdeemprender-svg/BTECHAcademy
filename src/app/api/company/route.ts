import { NextRequest, NextResponse } from 'next/server';
import { authenticateCaller } from '@/lib/api/mentor-auth';
import { FirestoreCompanyRepository } from '@/data/firestore/company-repo';
import { createCompany } from '@/domain/company';
import { adminDb } from '@/firebase/admin';

const repo = new FirestoreCompanyRepository();

/**
 * GET /api/company
 * Obtiene la información de la empresa gestionada por el usuario autenticado.
 */
export async function GET(req: NextRequest) {
  try {
    const caller = await authenticateCaller(req);
    if (!caller) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const requestedId = req.nextUrl.searchParams.get('id');
    const listAll = req.nextUrl.searchParams.get('all') === 'true';

    if (listAll && caller.isAdmin) {
      const snap = await adminDb.collection('companies').get();
      const list = snap.docs.map((d: any) => ({
        id: d.id,
        name: d.data()?.name || 'Empresa',
        slug: d.data()?.slug || '',
        ownerId: d.data()?.ownerId || '',
      }));
      return NextResponse.json({ success: true, data: list });
    }

    let company = null;
    if (requestedId && caller.isAdmin) {
      company = await repo.findById(requestedId);
    } else {
      // Buscar primero por ownerId
      company = await repo.findByOwnerId(caller.uid);
    }

    if (!company) {
      // Si no es owner por repositorio, verificar documento de usuario en Firestore
      const userDoc = await adminDb.collection('users').doc(caller.uid).get();
      const userData = userDoc.data();
      const companyId = userData?.companyId;
      if (companyId) {
        company = await repo.findById(companyId);
      }

      // Auto-provision si el usuario ya posee rol empresa o isEnterprise
      if (!company && (userData?.isEnterprise || userData?.roles?.includes('empresa') || userData?.companyRole === 'owner')) {
        const compId = companyId || caller.uid;
        const compName = userData?.companyName || userData?.displayName || 'Empresa';
        const baseSlug = compName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `empresa-${caller.uid.substring(0, 5)}`;
        
        const autoCompany = {
          id: compId,
          name: compName,
          slug: baseSlug,
          ownerId: caller.uid,
          branding: {
            primaryColor: userData?.profile?.branding?.primaryColor || '#1E40AF',
          },
          subscription: {
            planId: userData?.subscription?.planId || 'enterprise',
            planName: userData?.subscription?.name || 'Plan Empresa',
            status: 'active' as const,
            limits: {
              maxTutors: userData?.subscription?.limits?.maxTutors ?? 10,
              maxStudents: userData?.subscription?.limits?.maxStudents ?? 200,
            },
            currentUsage: {
              tutorsCount: 0,
              studentsCount: 0,
            },
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        try {
          await repo.save(autoCompany);
          await userDoc.ref.set({ companyId: compId, companyRole: 'owner', isEnterprise: true }, { merge: true });
          company = autoCompany;
        } catch (autoErr) {
          console.error('[API:Company:GET] Auto-provision failed:', autoErr);
        }
      }
    }

    if (!company) {
      return NextResponse.json({ success: false, error: 'Empresa no encontrada' }, { status: 404 });
    }

    let tutors: any[] = [];
    try {
      const resTutors = await repo.listTutors(company.id);
      if (Array.isArray(resTutors)) tutors = resTutors;
    } catch {
      tutors = [];
    }

    const formattedCompany = {
      ...company,
      limits: {
        maxTutors: company.subscription?.limits?.maxTutors ?? 10,
        maxStudents: company.subscription?.limits?.maxStudents ?? 200,
      },
      usage: {
        currentTutors: tutors.length || company.subscription?.currentUsage?.tutorsCount || 0,
        currentStudents: company.subscription?.currentUsage?.studentsCount || 0,
      },
      tutors,
    };

    return NextResponse.json({ success: true, data: formattedCompany, company: formattedCompany });
  } catch (error: any) {
    console.error('[API:Company:GET] Error obteniendo empresa:', error);
    return NextResponse.json({ success: false, error: error.message || 'Error del servidor' }, { status: 500 });
  }
}

/**
 * POST /api/company
 * Crea una nueva empresa y asigna el rol 'empresa' al usuario autenticado.
 */
export async function POST(req: NextRequest) {
  try {
    const caller = await authenticateCaller(req);
    if (!caller) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const id = body.id || `comp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const result = await createCompany(repo, {
      ...body,
      id,
      ownerId: caller.uid,
    });

    if (!result.ok) {
      const status = result.error.code === 'CONFLICT' ? 409 : 400;
      return NextResponse.json({ success: false, error: result.error.message }, { status });
    }

    // Actualizar el rol del usuario en Firestore a 'empresa' y vincular companyId
    const userRef = adminDb.collection('users').doc(caller.uid);
    const userDoc = await userRef.get();
    const currentRoles: string[] = userDoc.data()?.roles || ['mentor'];
    const updatedRoles = Array.from(new Set([...currentRoles, 'empresa']));

    await userRef.set(
      {
        roles: updatedRoles,
        companyId: result.value.id,
        companyRole: 'owner',
        updatedAt: new Date(),
      },
      { merge: true },
    );

    return NextResponse.json({ success: true, data: result.value }, { status: 201 });
  } catch (error: any) {
    console.error('[API:Company:POST] Error creando empresa:', error);
    return NextResponse.json({ success: false, error: error.message || 'Error del servidor' }, { status: 500 });
  }
}

/**
 * PUT /api/company
 * Actualiza la información o branding de la empresa gestionada por el caller.
 */
export async function PUT(req: NextRequest) {
  try {
    const caller = await authenticateCaller(req);
    if (!caller) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const companyId = body.id;
    if (!companyId) {
      return NextResponse.json({ success: false, error: 'ID de empresa requerido' }, { status: 400 });
    }

    const existing = await repo.findById(companyId);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Empresa no encontrada' }, { status: 404 });
    }

    if (!caller.isAdmin && existing.ownerId !== caller.uid) {
      return NextResponse.json({ success: false, error: 'Acceso denegado: no eres propietario de esta empresa' }, { status: 403 });
    }

    const updated = await repo.save({
      ...existing,
      name: body.name || existing.name,
      branding: {
        ...existing.branding,
        ...(body.branding || {}),
      },
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('[API:Company:PUT] Error actualizando empresa:', error);
    return NextResponse.json({ success: false, error: error.message || 'Error del servidor' }, { status: 500 });
  }
}
