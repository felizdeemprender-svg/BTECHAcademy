import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

const serviceAccount = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'service-account.json'), 'utf-8')
);

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = getFirestore();

async function deepDiagnosis() {
  const mentorEmail = 'bprocessmailing@gmail.com';
  const REAL_AUTH_UID = 'wopEachK2FchcKG5pORV56ZPAsh1'; // el UID del dueño del curso

  console.log('\n========================================');
  console.log('🔬 DIAGNÓSTICO PROFUNDO');
  console.log('========================================\n');

  // 1. Leer TODOS los docs de users con email bprocessmailing
  console.log('1. Buscando TODOS los docs con email bprocessmailing@gmail.com...');
  const allUsers = await db.collection('users').get();
  const matches = allUsers.docs.filter(d => 
    (d.data().email || '').toLowerCase() === mentorEmail.toLowerCase()
  );
  
  console.log(`   Encontrados: ${matches.length} documentos\n`);
  matches.forEach(d => {
    const data = d.data();
    console.log(`   📄 Doc ID: ${d.id}`);
    console.log(`      email: ${data.email}`);
    console.log(`      roles: ${JSON.stringify(data.roles)}`);
    console.log(`      subscription.invitationsPerCourse: ${data.subscription?.invitationsPerCourse}`);
    console.log(`      subscription.endDate: ${data.subscription?.endDate}`);
    console.log(`      subscription.planId: ${data.subscription?.planId}`);
    console.log('');
  });

  // 2. Leer el doc con el UID real de Auth
  console.log(`2. Leyendo doc con UID real de Auth: ${REAL_AUTH_UID}`);
  const realDoc = await db.collection('users').doc(REAL_AUTH_UID).get();
  if (realDoc.exists) {
    const rd = realDoc.data()!;
    console.log(`   ✅ Existe`);
    console.log(`   email: ${rd.email}`);
    console.log(`   roles: ${JSON.stringify(rd.roles)}`);
    console.log(`   subscription: ${JSON.stringify(rd.subscription, null, 4)}`);
  } else {
    console.log(`   ❌ NO existe doc en /users/${REAL_AUTH_UID}`);
    console.log('   → Cuando el mentor se loguea con Google, useAuth no puede cargar su perfil');
    console.log('   → profile podría ser null o incompleto');
  }

  // 3. Ver los cursos que tienen mentorId = REAL_AUTH_UID
  console.log(`\n3. Cursos con mentorId = ${REAL_AUTH_UID}...`);
  const coursesSnap = await db.collection('courses').where('mentorId', '==', REAL_AUTH_UID).get();
  console.log(`   ${coursesSnap.size} curso(s):`);
  coursesSnap.docs.forEach(d => {
    const c = d.data();
    console.log(`   - "${c.title}" (status: ${c.status}, isActive: ${c.isActive})`);
  });

  // 4. Ver el useAuth hook para entender qué UID usa
  console.log('\n4. Analizando el flujo de autenticación...');
  console.log('   Cuando el mentor se loguea con Google:');
  console.log(`   - Firebase Auth UID = ${REAL_AUTH_UID}`);
  console.log(`   - useAuth busca /users/${REAL_AUTH_UID}`);
  console.log(`   - Si ese doc NO existe → profile podría tener uid=${REAL_AUTH_UID} pero sin roles/suscripción`);
  console.log(`   - isMentor check en Firestore rules:`);
  console.log(`     'mentor' in getUserRoles() → lee /users/${REAL_AUTH_UID} en server`);
  
  // 5. Verificar el rol en el doc real
  if (realDoc.exists) {
    const roles = realDoc.data()!.roles || [];
    console.log(`\n   Roles en doc real (${REAL_AUTH_UID}): ${JSON.stringify(roles)}`);
    console.log(`   ¿Tiene rol mentor?: ${roles.includes('mentor') ? '✅ SÍ' : '❌ NO'}`);
    
    if (!roles.includes('mentor')) {
      console.log('\n   ⚠️  PROBLEMA: El doc real NO tiene rol "mentor"');
      console.log('   → Firestore rules isMentor() devuelve FALSE para este UID');
      console.log('   → Esto explicaría el error de permisos al crear enrollments');
    }
  }

  // 6. Simular exactamente lo que hace handleInviteStudent
  console.log('\n5. Simulando handleInviteStudent...');
  console.log('   El código hace estos pasos:');
  console.log('   a) Verifica límite de invitaciones del plan');
  console.log('   b) Busca si el alumno ya existe en /users/');
  console.log('   c) Si NO existe → setDoc(users/concienciadeabundancia8_gmail_com, newUser)');
  console.log('   d) setDoc(enrollments/..., enrollmentData)');
  console.log('\n   Regla Firestore para users CREATE:');
  console.log('   allow create: if isSignedIn() && (request.auth.uid == userId || isAdmin())');
  console.log('\n   ⚠️  Los MENTORES no están incluidos en la regla de create de /users/!');
  console.log('   → Cuando el alumno NO existe, el mentor NO puede crear su perfil provisional');
  console.log('   → Firestore lanza PERMISSION_DENIED');
  console.log('   → El catch lo muestra como "Error de Permisos o Red"');

  console.log('\n========================================');
  console.log('CONCLUSIÓN:');
  console.log('========================================');
  console.log('La regla /users/{userId} allow create solo permite:');
  console.log('  - El propio usuario (auth.uid == userId)');
  console.log('  - Admin');
  console.log('Los MENTORES no pueden crear perfiles provisionales de alumnos nuevos.');
  console.log('\nSolución: Agregar isMentor() a la regla CREATE de /users/');
  console.log('O: No crear el perfil al dar de alta, crearlo cuando el alumno entre.');
  console.log('========================================\n');

  process.exit(0);
}

deepDiagnosis().catch(e => { console.error(e); process.exit(1); });
