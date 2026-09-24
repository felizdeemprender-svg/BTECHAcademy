import { NextRequest, NextResponse } from 'next/server';
import { CreateLeadUseCase } from '@/domain/leads/use-cases/create-lead-use-case';
import { GetLeadsUseCase } from '@/domain/leads/use-cases/get-leads-use-case';
import { AdminLeadRepository } from '@/data/firestore/admin-lead-repo';
import { adminDb } from '@/firebase/admin';

const repo = new AdminLeadRepository();
const createLeadUseCase = new CreateLeadUseCase(repo);
const getLeadsUseCase = new GetLeadsUseCase(repo);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, name, mentorId, courseId, landingId } = body;

    // Validación básica de anti-colisión, similar a lo que hacía createOrFindLead
    if (!email || !courseId) {
      return NextResponse.json({ error: 'Missing email or courseId' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Verificar si ya existe para evitar duplicados
    const existingSnap = await adminDb.collection('leads')
      .where('studentEmail', '==', normalizedEmail)
      .where('courseId', '==', courseId)
      .limit(1)
      .get();

    if (!existingSnap.empty) {
      // Ya existe, devolver el existente
      const existingDoc = existingSnap.docs[0];
      return NextResponse.json({ 
        lead: { id: existingDoc.id, ...existingDoc.data() },
        wasExisting: true 
      });
    }

    // 2. Crear si no existe
    const data = {
      email: normalizedEmail,
      studentEmail: normalizedEmail, // Retrocompatibilidad
      studentName: name?.trim(),
      mentorId,
      referidoId: mentorId, // Retrocompatibilidad
      courseId,
      landingId,
      status: 'pending'
    };

    const newId = await createLeadUseCase.execute({
      email: normalizedEmail,
      name,
      mentorId
    });

    // Actualizamos el documento con los campos extra
    await adminDb.collection('leads').doc(newId).update(data);

    return NextResponse.json({
      lead: { id: newId, ...data },
      wasExisting: false
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    // Auth check here (simplified for this migration)
    const uid = req.headers.get('x-user-id') || '';
    const role = req.headers.get('x-user-role') || '';
    
    if (!uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const leads = await getLeadsUseCase.execute({
      uid,
      isAdmin: role === 'admin',
      isMentor: role === 'mentor' || role === 'tutor'
    });

    return NextResponse.json({ leads });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.message.includes('Unauthorized') ? 403 : 500 });
  }
}
