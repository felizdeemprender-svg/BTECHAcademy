import * as admin from 'firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

const serviceAccount = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'service-account.json'), 'utf-8')
);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = getFirestore();

// UIDs encontrados en el diagnóstico
const OLD_USER_DOC_ID = 'bprocessmailing_gmail_com'; // ID del doc en /users/
const REAL_AUTH_UID = 'wopEachK2FchcKG5pORV56ZPAsh1';  // UID real de Firebase Auth
const COURSE_ID_PASION = '2AAEy29PWe0AaEdSZeZB'; // "Develando la pasión"

async function fixMentorUid() {
  console.log('\n========================================');
  console.log('🔧 CORRIGIENDO UID DEL MENTOR');
  console.log('========================================\n');

  // 1. Leer el perfil actual del usuario con el ID incorrecto
  const oldDocRef = db.collection('users').doc(OLD_USER_DOC_ID);
  const oldSnap = await oldDocRef.get();

  if (!oldSnap.exists) {
    console.log('❌ No se encontró el documento con ID antiguo:', OLD_USER_DOC_ID);
    process.exit(1);
  }

  const userData = oldSnap.data()!;
  console.log('✅ Perfil encontrado con ID antiguo:', OLD_USER_DOC_ID);
  console.log('   Email:', userData.email);
  console.log('   Roles:', JSON.stringify(userData.roles));

  // 2. Verificar si ya existe un doc con el UID real
  const newDocRef = db.collection('users').doc(REAL_AUTH_UID);
  const newSnap = await newDocRef.get();

  if (newSnap.exists) {
    console.log('\n⚠️  Ya existe un documento con el UID real:', REAL_AUTH_UID);
    console.log('   Datos:', JSON.stringify(newSnap.data(), null, 2));
    console.log('\n   → Actualizando el doc existente con roles correctos...');
    await newDocRef.update({
      roles: userData.roles || ['mentor', 'marketing'],
      subscription: userData.subscription || null,
      isActive: true,
      updatedAt: FieldValue.serverTimestamp(),
    });
    console.log('   ✅ Doc actualizado');
  } else {
    // 3. Crear el nuevo documento con el UID real
    console.log('\n📝 Creando nuevo documento con UID real...');
    await newDocRef.set({
      ...userData,
      uid: REAL_AUTH_UID,
      updatedAt: FieldValue.serverTimestamp(),
    });
    console.log('   ✅ Nuevo documento creado:', REAL_AUTH_UID);
  }

  // 4. Actualizar el mentorId del curso "Develando la pasión"
  console.log('\n📚 Actualizando curso "Develando la pasión"...');
  const courseRef = db.collection('courses').doc(COURSE_ID_PASION);
  const courseSnap = await courseRef.get();
  
  if (!courseSnap.exists) {
    console.log('❌ Curso no encontrado:', COURSE_ID_PASION);
  } else {
    const courseData = courseSnap.data()!;
    console.log('   Título:', courseData.title);
    console.log('   mentorId actual:', courseData.mentorId);
    
    if (courseData.mentorId === REAL_AUTH_UID) {
      console.log('   ✅ El mentorId ya es correcto, no se necesita cambio');
    } else {
      await courseRef.update({
        mentorId: REAL_AUTH_UID,
        updatedAt: FieldValue.serverTimestamp(),
      });
      console.log('   ✅ mentorId actualizado a:', REAL_AUTH_UID);
    }
  }

  // 5. Actualizar enrollments del curso para consistencia
  console.log('\n📊 Revisando inscripciones del curso...');
  const enrollSnap = await db.collection('enrollments').where('courseId', '==', COURSE_ID_PASION).get();
  console.log(`   ${enrollSnap.size} inscripciones encontradas (no requieren cambio)`);

  // 6. Actualizar la suscripción - asegurar que invitationsPerCourse sea mayor a 0
  console.log('\n💳 Verificando suscripción del mentor...');
  const currentSub = userData.subscription;
  if (currentSub && currentSub.invitationsPerCourse === 0) {
    console.log('   ⚠️  invitationsPerCourse = 0, actualizando a 100...');
    await newDocRef.update({
      'subscription.invitationsPerCourse': 100,
      'subscription.updatedAt': FieldValue.serverTimestamp(),
    });
    console.log('   ✅ invitationsPerCourse actualizado a 100');
  } else {
    console.log('   invitationsPerCourse:', currentSub?.invitationsPerCourse);
  }

  console.log('\n========================================');
  console.log('✅ FIX COMPLETADO');
  console.log('========================================');
  console.log('\nPróximos pasos:');
  console.log('1. El mentor debe CERRAR SESIÓN y volver a entrar');
  console.log('2. Luego podrá dar de alta al alumno en "Develando la pasión"');
  console.log('========================================\n');
  
  process.exit(0);
}

fixMentorUid().catch(e => {
  console.error('❌ Error:', e);
  process.exit(1);
});
