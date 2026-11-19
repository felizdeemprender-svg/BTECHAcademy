import { adminDb } from '../src/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Script de migración segura e idempotente:
 * Asocia un tutor independiente existente a una empresa B2B.
 *
 * Uso:
 * npx tsx scripts/migrate-tutor-to-company.ts --tutorId <id> --companyId <id> [--canCreateCourses] [--canCreateMentorships]
 */
async function runMigration() {
  const args = process.argv.slice(2);
  const getArg = (name: string): string | null => {
    const idx = args.indexOf(`--${name}`);
    if (idx !== -1 && idx + 1 < args.length) return args[idx + 1];
    return null;
  };
  const hasFlag = (name: string): boolean => args.includes(`--${name}`);

  const tutorId = getArg('tutorId');
  const companyId = getArg('companyId');
  const canCreateCourses = hasFlag('canCreateCourses');
  const canCreateMentorships = hasFlag('canCreateMentorships');

  if (!tutorId || !companyId) {
    console.error('Error: Parámetros requeridos faltantes.');
    console.log('Uso: npx tsx scripts/migrate-tutor-to-company.ts --tutorId <id> --companyId <id> [--canCreateCourses] [--canCreateMentorships]');
    process.exit(1);
  }

  console.log(`[Migración] Iniciando vinculación de tutor ${tutorId} a empresa ${companyId}...`);

  try {
    // 1. Validar existencia de la empresa
    const companyDoc = await adminDb.collection('companies').doc(companyId).get();
    if (!companyDoc.exists) {
      throw new Error(`La empresa ${companyId} no existe.`);
    }
    const companyData = companyDoc.data() || {};
    const maxTutors = companyData.limits?.maxTutors ?? 5;

    // 2. Validar existencia del tutor
    const userDoc = await adminDb.collection('users').doc(tutorId).get();
    if (!userDoc.exists) {
      throw new Error(`El usuario tutor ${tutorId} no existe.`);
    }

    // 3. Chequear cupo disponible
    const tutorsSnap = await adminDb.collection('companies').doc(companyId).collection('tutors').where('status', '==', 'active').get();
    const currentTutorsCount = tutorsSnap.size;
    const isAlreadyMember = tutorsSnap.docs.some(d => d.id === tutorId);

    if (!isAlreadyMember && maxTutors !== -1 && currentTutorsCount >= maxTutors) {
      throw new Error(`Límite de tutores alcanzado (${currentTutorsCount}/${maxTutors}). Actualice el plan de la empresa antes de migrar.`);
    }

    // 4. Crear o actualizar binding en subcolección
    const tutorBindingRef = adminDb.collection('companies').doc(companyId).collection('tutors').doc(tutorId);
    await tutorBindingRef.set({
      tutorId,
      companyId,
      role: 'tutor',
      permissions: {
        canCreateCourses: canCreateCourses ?? true,
        canCreateMentorships: canCreateMentorships ?? true,
        canPublishDirectly: false,
      },
      status: 'active',
      joinedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    // 5. Actualizar documento de usuario
    await adminDb.collection('users').doc(tutorId).set({
      companyId,
      companyRole: 'tutor',
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    // 6. Migrar cursos existentes del tutor a la empresa
    const coursesSnap = await adminDb.collection('courses').where('mentorId', '==', tutorId).get();
    const batch = adminDb.batch();
    let coursesCount = 0;

    coursesSnap.forEach((doc) => {
      batch.update(doc.ref, {
        companyId,
        ownerId: companyId,
        updatedAt: FieldValue.serverTimestamp(),
      });
      coursesCount++;
    });

    if (coursesCount > 0) {
      await batch.commit();
    }

    console.log(`[Migración exitosa]`);
    console.log(`- Tutor ${tutorId} vinculado a empresa ${companyId}.`);
    console.log(`- Cursos migrados a la empresa: ${coursesCount}`);
    console.log(`- Cupo actual: ${isAlreadyMember ? currentTutorsCount : currentTutorsCount + 1}/${maxTutors === -1 ? 'Ilimitado' : maxTutors}`);
  } catch (err: any) {
    console.error(`[Error de migración]:`, err.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

runMigration();
