import { adminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

async function main() {
  console.log('Iniciando restauración de logs antiguos...');
  
  try {
    const pricingSnap = await adminDb.collection('config').doc('ai_pricing').get();
    const pricing = pricingSnap.data() || {};
    
    const geminiMarkup = 1 + (pricing.geminiMarkupPercentage || 30) / 100;
    const ttsMarkup = 1 + (pricing.ttsMarkupPercentage || 40) / 100;
    const imageMarkup = 1 + (pricing.imageMarkupPercentage || 50) / 100;
    const videoMarkup = 1 + (pricing.videoMarkupPercentage || 50) / 100;
    const omniMarkup = 1 + (pricing.omniMarkupPercentage || 10) / 100;

    const logsSnap = await adminDb.collection('ai_audit_logs').get();
    console.log(`Se encontraron ${logsSnap.size} registros de auditoría.`);

    const dailyUsage: Record<string, Record<string, any>> = {};
    let restoredCount = 0;
    
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

    for (const doc of logsSnap.docs) {
      const data = doc.data();
      const action = data.action || '';
      const actionLower = action.toLowerCase();
      let amount = data.amount || 0;
      let providerCost = data.providerCost || 0;
      const targetUid = data.targetUid || data.actorUid;
      
      // Si el log tiene amount 0 y no es un log genuino de costo 0
      if (amount === 0 && targetUid && data.timestamp) {
        // Intentar recuperar de ai_transactions
        const transSnap = await adminDb.collection('users')
          .doc(targetUid)
          .collection('ai_transactions')
          .where('timestamp', '==', data.timestamp)
          .limit(1)
          .get();
          
        if (!transSnap.empty) {
          const transData = transSnap.docs[0].data();
          if (transData.amount > 0) {
            amount = transData.amount;
            
            // Revertir el markup para encontrar el providerCost
            if (actionLower.includes('image')) providerCost = amount / imageMarkup;
            else if (actionLower.includes('audio') || actionLower.includes('tts')) providerCost = amount / ttsMarkup;
            else if (actionLower.includes('video_render') || actionLower.includes('video_carousel')) providerCost = amount / videoMarkup;
            else if (actionLower.includes('video_omni')) providerCost = amount / omniMarkup; // Simplificación
            else providerCost = amount / geminiMarkup;
            
            // Si el user quiere recalculado con el nuevo markup,
            // si restored amount ya tenía un markup viejo, al hacer esto estamos "preservando"
            // el amount original que se cobró. 
            // Si quisiéramos recalcular con el nuevo, tendríamos que aplicar el nuevo markup al viejo providerCost.
            // Para mantener la integridad económica original (el user no pidió cambiar saldos),
            // dejamos el amount que realmente se les cobró en su momento.
            
            currentBatch.update(doc.ref, {
              amount: Number(amount.toFixed(5)),
              providerCost: Number(providerCost.toFixed(5)),
              profit: Number((amount - providerCost).toFixed(5))
            });
            await addOp();
            restoredCount++;
          }
        }
      }

      let category = 'text';
      if (actionLower.includes('image')) category = 'image';
      else if (actionLower.includes('audio') || actionLower.includes('tts')) category = 'audio';
      else if (actionLower.includes('video')) category = 'video';
      else category = 'text';
      
      if (data.isReferential) category = 'alumnos';

      if (!data.timestamp) continue;
      
      const dateStr = data.timestamp.toDate ? data.timestamp.toDate().toISOString().split('T')[0] : new Date(data.timestamp._seconds * 1000).toISOString().split('T')[0];
      
      if (!dailyUsage[targetUid]) dailyUsage[targetUid] = {};
      if (!dailyUsage[targetUid][dateStr]) {
        dailyUsage[targetUid][dateStr] = { total: 0, text: 0, video: 0, image: 0, audio: 0, alumnos: 0 };
      }
      
      dailyUsage[targetUid][dateStr].total += amount;
      dailyUsage[targetUid][dateStr][category] += amount;
    }

    console.log('Sobreescribiendo colecciones diarias (ai_usage_daily)...');
    
    for (const uid of Object.keys(dailyUsage)) {
      for (const dateStr of Object.keys(dailyUsage[uid])) {
        const usageData = dailyUsage[uid][dateStr];
        const dailyRef = adminDb.collection('users').doc(uid).collection('ai_usage_daily').doc(dateStr);
        
        currentBatch.set(dailyRef, {
          timestamp: FieldValue.serverTimestamp(),
          date: dateStr,
          total: Number(usageData.total.toFixed(5)),
          text: Number(usageData.text.toFixed(5)),
          video: Number(usageData.video.toFixed(5)),
          image: Number(usageData.image.toFixed(5)),
          audio: Number(usageData.audio.toFixed(5)),
          alumnos: Number(usageData.alumnos.toFixed(5)),
        });
        await addOp();
      }
    }

    await commitBatch();
    await Promise.all(batches);

    console.log(`¡Restauración Finalizada! Se recuperaron ${restoredCount} transacciones antiguas.`);
    process.exit(0);
  } catch (err) {
    console.error('Error catastrófico durante la restauración:', err);
    process.exit(1);
  }
}

main();
