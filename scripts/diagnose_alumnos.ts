import * as path from 'path';
process.chdir(path.join(__dirname, '..'));
const { getAdminFirestore } = require('../src/firebase/admin');

async function main() {
  const db = getAdminFirestore();

  const MENTOR_ID = 'wopEachK2FchcKG5pORV56ZPAsh1';
  const MENTOR_EMAIL = 'bprocessmailing@gmail.com';

  console.log(`\n✅ Mentor: Ari y Lu Belotti - Feliz de emprender`);
  console.log(`   UID: ${MENTOR_ID}`);
  console.log(`   Email: ${MENTOR_EMAIL}`);

  // 1. Cursos del mentor
  console.log(`\n📚 Cursos con mentorId = "${MENTOR_ID}":`);
  const coursesSnap = await db.collection('courses').where('mentorId', '==', MENTOR_ID).get();

  if (coursesSnap.empty) {
    console.log('   ❌ NO se encontraron cursos para este mentorId.');
    return;
  }

  const courseIds: string[] = coursesSnap.docs.map((d: any) => d.id);
  console.log(`   ✅ ${courseIds.length} curso(s):`);
  coursesSnap.docs.forEach((d: any) => console.log(`      - [${d.id}] "${d.data().title}" | status: ${d.data().status}`));

  // 2. Enrollments
  console.log(`\n👥 Buscando enrollments...`);
  let totalEnrollments = 0;
  const emailSet = new Set<string>();
  let noEmailCount = 0;
  let noStudentIdCount = 0;
  const statusCounts: Record<string, number> = {};
  const sampleRows: any[] = [];

  for (let i = 0; i < courseIds.length; i += 30) {
    const chunk = courseIds.slice(i, i + 30);
    const enrollSnap = await db.collection('enrollments').where('courseId', 'in', chunk).get();
    totalEnrollments += enrollSnap.size;

    enrollSnap.docs.forEach((d: any) => {
      const data = d.data();
      if (!data.inviteEmail) noEmailCount++;
      else emailSet.add(data.inviteEmail.toLowerCase().trim());
      if (!data.studentId) noStudentIdCount++;
      const st = data.status || 'undefined';
      statusCounts[st] = (statusCounts[st] || 0) + 1;
      if (sampleRows.length < 5) {
        sampleRows.push({
          id: d.id,
          inviteEmail: data.inviteEmail,
          studentId: data.studentId,
          status: data.status,
          courseId: data.courseId
        });
      }
    });
  }

  console.log(`   Total enrollments: ${totalEnrollments}`);
  console.log(`   Alumnos únicos por email: ${emailSet.size}`);
  console.log(`   Sin inviteEmail: ${noEmailCount}`);
  console.log(`   Sin studentId: ${noStudentIdCount}`);
  console.log(`   Por status:`, statusCounts);

  console.log(`\n📋 Muestra de enrollments (primeros 5):`);
  sampleRows.forEach(r => console.log(`   `, JSON.stringify(r)));

  if (emailSet.size > 0) {
    console.log(`\n📧 Primeros emails únicos:`);
    Array.from(emailSet).slice(0, 10).forEach(e => console.log(`      - ${e}`));
  }

  // 3. Verificar roles del mentor
  const mentorDoc = await db.collection('users').doc(MENTOR_ID).get();
  if (mentorDoc.exists) {
    const data = mentorDoc.data();
    console.log(`\n🔐 Roles del mentor en Firestore: ${JSON.stringify(data.roles)}`);
    console.log(`   → isMentor (roles.includes('mentor')): ${data.roles?.includes('mentor')}`);
    console.log(`   → isAdmin (roles.includes('admin')): ${data.roles?.includes('admin')}`);
  }
}

main().catch(console.error);
