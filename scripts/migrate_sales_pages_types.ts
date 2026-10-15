import { adminDb } from '../src/firebase/admin';

interface UpdatePlan {
  id: string;
  title: string;
  mentorId: string;
  currentType: any;
  targetType: string;
  currentLandingType: any;
  targetLandingType: string;
}

export async function planMigration(): Promise<UpdatePlan[]> {
  const snapshot = await adminDb.collection('salesPages').get();
  const plan: UpdatePlan[] = [];

  for (const doc of snapshot.docs) {
    const d = doc.data();
    const hasV2Sections = !!(d.content && d.content.sections && d.content.sections.length > 0);
    
    // Ignorar packs multimedia legacy sin secciones V2
    if (!hasV2Sections && d.type === 'campaign_pack') {
      continue;
    }

    // Documentos sin contenido ni mentor (basura)
    if (!hasV2Sections && !d.mentorId) {
      continue;
    }

    let needsUpdate = false;
    let targetType = d.type;
    let targetLandingType = d.landingType;

    // 1. Normalizar type a landing_page (salvo que sea funnel)
    if (d.type !== 'funnel' && d.type !== 'landing_page') {
      targetType = 'landing_page';
      needsUpdate = true;
    }

    // 2. Normalizar landingType si está vacío
    if (!d.landingType) {
      targetLandingType = d.referidoId ? 'promocion' : 'general';
      needsUpdate = true;
    }

    if (needsUpdate) {
      plan.push({
        id: doc.id,
        title: d.title || 'Sin Título',
        mentorId: d.mentorId || 'Sin Mentor',
        currentType: d.type,
        targetType,
        currentLandingType: d.landingType,
        targetLandingType
      });
    }
  }

  return plan;
}

async function main() {
  const isExecute = process.argv.includes('--execute');
  console.log(`=== PLAN DE MIGRACIÓN Y NORMALIZACIÓN DE salesPages (Modo: ${isExecute ? 'EJECUCIÓN REAL' : 'SIMULACIÓN / DRY-RUN'}) ===\n`);

  const plan = await planMigration();
  console.log(`Total documentos a normalizar: ${plan.length}\n`);

  for (const item of plan) {
    console.log(`[${item.id}] "${item.title}" (Mentor: ${item.mentorId})`);
    console.log(`   - type: "${item.currentType}" -> "${item.targetType}"`);
    console.log(`   - landingType: "${item.currentLandingType}" -> "${item.targetLandingType}"`);
  }

  if (!isExecute) {
    console.log('\n>>> Simulación finalizada. Para aplicar los cambios en la base de datos, ejecuta con el flag --execute.');
    return;
  }

  console.log('\n>>> APLICANDO CAMBIOS EN FIRESTORE...');
  const batch = adminDb.batch();

  for (const item of plan) {
    const ref = adminDb.collection('salesPages').doc(item.id);
    batch.update(ref, {
      type: item.targetType,
      landingType: item.targetLandingType,
      updatedAt: new Date().toISOString()
    });
  }

  await batch.commit();
  console.log('✅ Migración completada con éxito. Todos los documentos fueron normalizados en Firestore.');
}

if (require.main === module) {
  main().catch(console.error);
}
