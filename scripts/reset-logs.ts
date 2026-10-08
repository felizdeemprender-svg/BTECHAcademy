import { adminDb } from '../src/firebase/admin';

async function resetExecutionLogs() {
  console.log("Buscando campañas...");
  const campaigns = await adminDb.collection('campaigns').get();
  
  let count = 0;
  for (const doc of campaigns.docs) {
    const data = doc.data();
    if (!data.executionLogs || data.executionLogs.length === 0) continue;

    let updated = false;
    const newLogs = data.executionLogs.map((log: any) => {
      // Reseteamos success/processing/error/failed de vuelta a pending
      if (log.status !== 'pending') {
        updated = true;
        count++;
        return {
          ...log,
          status: 'pending',
          error: null,
          metadata: { ...(log.metadata || {}), resetAt: new Date().toISOString() }
        };
      }
      return log;
    });

    if (updated) {
      await doc.ref.update({ executionLogs: newLogs });
      console.log(`Campaña reseteada: ${doc.id}`);
    }
  }
  
  console.log(`\n¡Listo! ${count} piezas de ejecución reseteadas a 'pending' para la prueba.`);
  process.exit(0);
}

resetExecutionLogs().catch(console.error);
