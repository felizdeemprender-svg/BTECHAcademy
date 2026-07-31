import { getAdminFirestore } from '../src/firebase/admin';

async function compareProgress() {
  const db = getAdminFirestore();
  const email = 'hadasdecristal27@gmail.com';
  const courseId = 'lkK84waxKvxoSrpYtxBC'; // ESCALAR

  console.log('=== Comparando progreso para:', email, '===');

  // 1. Buscar inscripción
  const enrollmentsSnapshot = await db.collection('enrollments')
    .where('inviteEmail', '==', email.toLowerCase().trim())
    .where('courseId', '==', courseId)
    .get();

  if (enrollmentsSnapshot.empty) {
    console.log('❌ Inscripción no encontrada');
    return;
  }

  const enrollment = enrollmentsSnapshot.docs[0].data();
  console.log('Inscripción ID:', enrollmentsSnapshot.docs[0].id);
  console.log('Estado:', enrollment.status);
  console.log('progressPercent guardado:', enrollment.progressPercent);

  // 2. Obtener módulos del curso
  const modulesSnapshot = await db.collection('courses').doc(courseId).collection('modules')
    .orderBy('order', 'asc')
    .get();

  const modules: any[] = modulesSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  console.log('\nTotal módulos:', modules.length);

  // 3. Datos de progreso
  const completedModules = enrollment.progress?.completedModules || [];
  const evaluations = enrollment.progress?.evaluations || {};
  
  console.log('completedModules:', completedModules);
  console.log('evaluations:', evaluations);

  // 4. Cálculo SIMPLE (tutor)
  const simpleProgress = Math.round((completedModules.length / modules.length) * 100);
  console.log('\n=== CÁLCULO SIMPLE (TUTOR) ===');
  console.log('Fórmula: (completedModules.length / totalModules) * 100');
  console.log(`(${completedModules.length} / ${modules.length}) * 100 = ${simpleProgress}%`);

  // 5. Cálculo COMPLEJO (alumno - useCourseProgressV3)
  let processedCount = 0;
  
  modules.forEach(mod => {
    const isCompleted = completedModules.includes(mod.id);
    const evaluation = evaluations[mod.id];
    const hasEvaluation = !!evaluation;
    const allowsRetries = mod.allowRetries !== false;
    const needsSupport = mod.enableSupportQuestions && mod.supportQuestions?.length > 0;
    
    if (isCompleted) {
      processedCount++;
    } else if (hasEvaluation) {
      if (!allowsRetries) {
        if (!needsSupport || evaluation.isSupport) {
          processedCount++;
        }
      }
    }
  });

  const complexProgress = Math.round((processedCount / modules.length) * 100);
  console.log('\n=== CÁLCULO COMPLEJO (ALUMNO) ===');
  console.log('Fórmula: (processedCount / totalModules) * 100');
  console.log(`Considera evaluaciones, reintentos, preguntas de apoyo`);
  console.log(`(${processedCount} / ${modules.length}) * 100 = ${complexProgress}%`);

  // 6. Comparación
  console.log('\n=== COMPARACIÓN ===');
  console.log('Valor tutor (simple):', simpleProgress + '%');
  console.log('Valor alumno (complejo):', complexProgress + '%');
  console.log('Valor guardado en DB:', enrollment.progressPercent + '%');
  
  if (simpleProgress !== complexProgress) {
    console.log('⚠️ DIFERENCIA DETECTADA:', Math.abs(simpleProgress - complexProgress) + '%');
  } else {
    console.log('✅ VALORES IGUALES');
  }
}

compareProgress().catch(console.error);
