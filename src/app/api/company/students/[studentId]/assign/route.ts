import { NextRequest, NextResponse } from 'next/server';
import { authenticateCaller } from '@/lib/api/mentor-auth';
import { FirestoreCompanyRepository } from '@/data/firestore/company-repo';
import { assignStudentToCompanyTutor } from '@/domain/company';
import { adminDb } from '@/firebase/admin';

const repo = new FirestoreCompanyRepository();

async function resolveCallerCompanyId(caller: { uid: string; isAdmin: boolean }): Promise<string | null> {
  const company = await repo.findByOwnerId(caller.uid);
  if (company) return company.id;

  const userDoc = await adminDb.collection('users').doc(caller.uid).get();
  return userDoc.data()?.companyId || null;
}

/**
 * PUT /api/company/students/[studentId]/assign
 * Asigna o reasigna un alumno a un tutor de la empresa.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> },
) {
  try {
    const caller = await authenticateCaller(req);
    if (!caller) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const { studentId } = await params;
    const body = await req.json();
    const tutorId = body.tutorId;
    const companyId = caller.isAdmin && body.companyId
      ? body.companyId
      : (await resolveCallerCompanyId(caller));

    if (!companyId) {
      return NextResponse.json({ success: false, error: 'Empresa no encontrada' }, { status: 404 });
    }

    if (!tutorId) {
      return NextResponse.json({ success: false, error: 'ID de tutor requerido' }, { status: 400 });
    }

    const company = await repo.findById(companyId);
    if (!company) {
      return NextResponse.json({ success: false, error: 'Empresa no encontrada' }, { status: 404 });
    }

    // El owner o admin puede asignar alumnos
    if (!caller.isAdmin && company.ownerId !== caller.uid) {
      return NextResponse.json({ success: false, error: 'Acceso denegado: solo el titular de la empresa puede asignar alumnos' }, { status: 403 });
    }

    const result = await assignStudentToCompanyTutor(repo, {
      companyId,
      studentId,
      tutorId,
    });

    if (!result.ok) {
      const status =
        result.error.code === 'NOT_FOUND'
          ? 404
          : result.error.code === 'FORBIDDEN'
            ? 403
            : 400;
      return NextResponse.json({ success: false, error: result.error.message }, { status });
    }

    // Actualizar el documento del alumno en Firestore con el tutor asignado
    await adminDb.collection('students').doc(studentId).set(
      {
        companyId,
        assignedTutorId: tutorId,
        assignedTutorName: result.value.assignedTutorName,
        updatedAt: new Date(),
      },
      { merge: true },
    );

    return NextResponse.json({ success: true, data: result.value });
  } catch (error: any) {
    console.error('[API:Company:Students:Assign:PUT] Error asignando alumno:', error);
    return NextResponse.json({ success: false, error: error.message || 'Error del servidor' }, { status: 500 });
  }
}
