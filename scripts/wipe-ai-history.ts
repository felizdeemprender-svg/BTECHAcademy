import { adminDb } from '@/firebase/admin';

async function main() {
  console.log('Iniciando borrado total (Wipe) del historial de IA...');
  
  try {
    let deletedLogs = 0;
    let deletedUsage = 0;
    let deletedTransactions = 0;

    const batches = [];
    let currentBatch = adminDb.batch();
    let opCount = 0;

    const commitBatch = async () => {
      if (opCount > 0) {
        batches.push(currentBatch.commit());
        currentBatch = adminDb.batch();
        opCount = 0;
      }
    };

    const addOp = async () => {
      opCount++;
      if (opCount >= 400) {
        await commitBatch();
      }
    };

    // 1. Borrar ai_audit_logs globales
    console.log('Borrando ai_audit_logs...');
    const logsSnap = await adminDb.collection('ai_audit_logs').get();
    for (const doc of logsSnap.docs) {
      currentBatch.delete(doc.ref);
      deletedLogs++;
      await addOp();
    }

    // 2. Borrar las subcolecciones de usuarios
    console.log('Borrando subcolecciones de usuarios...');
    const usersSnap = await adminDb.collection('users').get();
    
    for (const user of usersSnap.docs) {
      // 2a. Borrar ai_usage_daily
      const usageSnap = await user.ref.collection('ai_usage_daily').get();
      for (const usage of usageSnap.docs) {
        currentBatch.delete(usage.ref);
        deletedUsage++;
        await addOp();
      }
      
      // 2b. Borrar ai_transactions (historial personal de billetera)
      const transSnap = await user.ref.collection('ai_transactions').get();
      for (const trans of transSnap.docs) {
        currentBatch.delete(trans.ref);
        deletedTransactions++;
        await addOp();
      }
    }

    await commitBatch();
    await Promise.all(batches);

    console.log('¡Wipe Exitoso!');
    console.log(`- Registros Globales (Audit Logs) eliminados: ${deletedLogs}`);
    console.log(`- Agregados Diarios eliminados: ${deletedUsage}`);
    console.log(`- Transacciones Personales eliminadas: ${deletedTransactions}`);
    process.exit(0);
  } catch (err) {
    console.error('Error durante el Wipe:', err);
    process.exit(1);
  }
}

main();
