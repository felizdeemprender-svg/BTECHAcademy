import { getAdminFirestore } from '../src/firebase/admin';

async function main() {
  const db = getAdminFirestore();

  const toDate = (val: any): Date | null => {
    if (!val) return null;
    if (typeof val.toDate === 'function') return val.toDate();
    if (val.seconds) return new Date(val.seconds * 1000);
    return null;
  };

  // ── 1. DEVELANDOS: fechas de creación ──
  const [snap1, snap2] = await Promise.all([
    db.collection('templateCollections').doc('1cfqxt4adk9').get(),
    db.collection('templateCollections').doc('6lIRNSr9YoLCt7vD7RY7').get(),
  ]);

  const d1 = snap1.data();
  const d2 = snap2.data();
  const date1 = toDate(d1?.createdAt);
  const date2 = toDate(d2?.createdAt);

  console.log('\n══════════════════════════════════════════════════════');
  console.log('📅  DEVELANDOS — COMPARACIÓN POR FECHA DE CREACIÓN');
  console.log('══════════════════════════════════════════════════════');

  console.log(`\n  [A] ID: 1cfqxt4adk9`);
  console.log(`      Nombre  : "${d1?.name || '(sin nombre)'}"`);
  console.log(`      Creado  : ${date1 ? date1.toLocaleString('es-AR') : '(sin fecha)'}`);
  console.log(`      Landings: 2\n`);

  console.log(`  [B] ID: 6lIRNSr9YoLCt7vD7RY7`);
  console.log(`      Nombre  : "${d2?.name || '(sin nombre)'}"`);
  console.log(`      Creado  : ${date2 ? date2.toLocaleString('es-AR') : '(sin fecha)'}`);
  console.log(`      Landings: 1\n`);

  if (date1 && date2) {
    if (date1 < date2) {
      console.log(`  🕰️  MÁS ANTIGUO → [A] 1cfqxt4adk9  (${date1.toLocaleString('es-AR')})`);
      console.log(`  🆕  MÁS RECIENTE → [B] 6lIRNSr9...  (${date2.toLocaleString('es-AR')})\n`);
    } else {
      console.log(`  🕰️  MÁS ANTIGUO → [B] 6lIRNSr9...  (${date2.toLocaleString('es-AR')})`);
      console.log(`  🆕  MÁS RECIENTE → [A] 1cfqxt4adk9  (${date1.toLocaleString('es-AR')})\n`);
    }
  }

  // ── 2. ANGEL: curso vinculado ──
  const angelSnap = await db.collection('salesPages').doc('t95nsu9rrq9').get();
  const angelData = angelSnap.data();
  const courseId = angelData?.courseId;

  console.log('══════════════════════════════════════════════════════');
  console.log('👼  ANGEL — CURSO VINCULADO A LA LANDING');
  console.log('══════════════════════════════════════════════════════');
  console.log(`\n  Landing  : "${angelData?.title || '(sin título)'}"`);
  console.log(`  CourseID : ${courseId || '(sin courseId)'}`);

  if (courseId) {
    const courseSnap = await db.collection('courses').doc(courseId).get();
    if (courseSnap.exists) {
      const course = courseSnap.data();
      console.log(`\n  ✅ Curso encontrado:`);
      console.log(`     📚 Nombre  : "${course?.title || '(sin título)'}"`);
      console.log(`     👤 MentorId: ${course?.mentorId}`);
      console.log(`     📌 Estado  : ${course?.status || '(sin estado)'}`);
    } else {
      console.log(`\n  ❌ El curso (${courseId}) ya no existe en Firestore.`);
    }
  }
  console.log('');
}

main().catch(console.error);
