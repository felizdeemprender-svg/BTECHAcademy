import { adminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

async function main() {
  console.log('Iniciando recálculo masivo de historial de consumos de IA...');
  
  try {
    // 1. Fetch AI Pricing Config
    const pricingSnap = await adminDb.collection('config').doc('ai_pricing').get();
    const pricing = pricingSnap.data() || {};
    
    const geminiMarkup = 1 + (pricing.geminiMarkupPercentage || 30) / 100;
    const ttsMarkup = 1 + (pricing.ttsMarkupPercentage || 40) / 100;
    const imageMarkup = 1 + (pricing.imageMarkupPercentage || 50) / 100;
    const videoMarkup = 1 + (pricing.videoMarkupPercentage || 50) / 100;
    const omniMarkup = 1 + (pricing.omniMarkupPercentage || 10) / 100;
    
    const omniBasePrice = pricing.omniPricePerMinute || 1.00;
    const ffmpegBasePrice = pricing.videoPricePerMinute || 0.60;
    const totalOmniProviderBase = omniBasePrice + ffmpegBasePrice;
    
    console.log('--- Markups Actuales Cargados ---');
    console.log(`Gemini: ${pricing.geminiMarkupPercentage}%`);
    console.log(`Video Clásico: ${pricing.videoMarkupPercentage}%`);
    console.log(`Video Omni: ${pricing.omniMarkupPercentage}%`);
    console.log(`Imagen: ${pricing.imageMarkupPercentage}%`);

    // Fetch all logs
    console.log('Leyendo todos los ai_audit_logs...');
    const logsSnap = await adminDb.collection('ai_audit_logs').get();
    console.log(`Se encontraron ${logsSnap.size} registros de auditoría.`);

    const dailyUsage: Record<string, Record<string, any>> = {};
    let updatedLogsCount = 0;
    
    // We will batch process
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
      const providerCost = data.providerCost || 0;
      
      let newAmount = providerCost;
      let category = 'text';

      // Identificar categoría y recalcular amount
      if (actionLower.includes('image')) {
        category = 'image';
        newAmount = providerCost * imageMarkup;
      } else if (actionLower.includes('audio') || actionLower.includes('tts')) {
        category = 'audio';
        newAmount = providerCost * ttsMarkup;
      } else if (actionLower === 'video_render_v2' || actionLower === 'video_carousel_v2') {
        category = 'video';
        newAmount = providerCost * videoMarkup;
      } else if (actionLower.includes('video_omni')) {
        category = 'video';
        // Formula mixta para Omni
        const omniFraction = omniBasePrice / totalOmniProviderBase;
        const ffmpegFraction = ffmpegBasePrice / totalOmniProviderBase;
        
        const omniCost = providerCost * omniFraction * omniMarkup;
        const ffmpegCost = providerCost * ffmpegFraction * videoMarkup;
        newAmount = omniCost + ffmpegCost;
      } else {
        // Texto por defecto
        category = 'text';
        newAmount = providerCost * geminiMarkup;
      }
      
      if (data.isReferential) {
        category = 'alumnos';
      }

      newAmount = Number(newAmount.toFixed(5));
      const profit = Number((newAmount - providerCost).toFixed(5));

      // Actualizar Audit Log
      currentBatch.update(doc.ref, {
        amount: newAmount,
        profit: profit
      });
      await addOp();
      updatedLogsCount++;

      // Agregar a métricas diarias
      const targetUid = data.targetUid || data.actorUid;
      if (!targetUid || !data.timestamp) continue;
      
      const dateStr = data.timestamp.toDate ? data.timestamp.toDate().toISOString().split('T')[0] : new Date(data.timestamp._seconds * 1000).toISOString().split('T')[0];
      
      if (!dailyUsage[targetUid]) dailyUsage[targetUid] = {};
      if (!dailyUsage[targetUid][dateStr]) {
        dailyUsage[targetUid][dateStr] = { total: 0, text: 0, video: 0, image: 0, audio: 0, alumnos: 0 };
      }
      
      dailyUsage[targetUid][dateStr].total += newAmount;
      dailyUsage[targetUid][dateStr][category] += newAmount;
    }

    // Escribir los totales diarios
    console.log('Sobreescribiendo colecciones diarias (ai_usage_daily)...');
    
    for (const uid of Object.keys(dailyUsage)) {
      for (const dateStr of Object.keys(dailyUsage[uid])) {
        const usageData = dailyUsage[uid][dateStr];
        const dailyRef = adminDb.collection('users').doc(uid).collection('ai_usage_daily').doc(dateStr);
        
        currentBatch.set(dailyRef, {
          timestamp: FieldValue.serverTimestamp(), // Just keep a fresh timestamp for debugging
          date: dateStr,
          total: Number(usageData.total.toFixed(5)),
          text: Number(usageData.text.toFixed(5)),
          video: Number(usageData.video.toFixed(5)),
          image: Number(usageData.image.toFixed(5)),
          audio: Number(usageData.audio.toFixed(5)),
          alumnos: Number(usageData.alumnos.toFixed(5)),
        }); // OVERWRITE mode: it will reset old ghosts if any.
        await addOp();
      }
    }

    await commitBatch();
    await Promise.all(batches);

    console.log(`¡Proceso Finalizado! Se recalcularon ${updatedLogsCount} transacciones en toda la historia.`);
    process.exit(0);
  } catch (err) {
    console.error('Error catastrófico durante el recálculo:', err);
    process.exit(1);
  }
}

main();
