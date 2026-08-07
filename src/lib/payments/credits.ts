import { adminDb } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export interface CostBreakdown {
  providerCost: number;
  billedCost: number;
}

/**
 * Calcula el costo en créditos de una operación.
 */
export async function calculateGeminiCost(tokens: number): Promise<CostBreakdown> {
  const pricingSnap = await adminDb.collection('config').doc('ai_pricing').get();
  const pricing = pricingSnap.data() || {};
  
  const baseCost = pricing.geminiPricePerMillionTokens || 0.3;
  const markup = pricing.geminiMarkupPercentage || 30;

  const rawProviderCost = (tokens / 1000000) * baseCost;
  const pricePerMillion = baseCost * (1 + markup / 100);
  const rawBilledCost = (tokens / 1000000) * pricePerMillion;
  
  return {
    providerCost: Number(rawProviderCost.toFixed(5)),
    billedCost: Number(rawBilledCost.toFixed(5))
  };
}

/**
 * Calcula el costo de un renderizado de video por minuto.
 */
export async function calculateVideoCost(durationSeconds: number, engine: 'ffmpeg' | 'omni' = 'ffmpeg'): Promise<CostBreakdown> {
  const pricingSnap = await adminDb.collection('config').doc('ai_pricing').get();
  const pricing = pricingSnap.data() || {};
  
  const minutes = durationSeconds / 60;
  
  // Costo base FFmpeg (Ensamble / Render Clásico)
  const ffmpegBasePrice = pricing.videoPricePerMinute || 0.60;
  const ffmpegMarkup = 1 + (pricing.videoMarkupPercentage || 50) / 100;
  const ffmpegProviderCost = minutes * ffmpegBasePrice;
  const ffmpegBilledCost = minutes * ffmpegBasePrice * ffmpegMarkup;
  
  if (engine === 'omni') {
    // Costo de la generación de Inteligencia Artificial (Omni/Vertex)
    const omniBasePrice = pricing.omniPricePerMinute || 1.00; // default 1 USD/min
    const omniMarkup = 1 + (pricing.omniMarkupPercentage || 10) / 100;
    
    const omniProviderCost = minutes * omniBasePrice;
    const omniBilledCost = minutes * omniBasePrice * omniMarkup;
    
    // Total = IA + Ensamble
    const totalProviderCost = omniProviderCost + ffmpegProviderCost;
    const totalBilledCost = omniBilledCost + ffmpegBilledCost;
    return {
      providerCost: Number(totalProviderCost.toFixed(4)),
      billedCost: Number(totalBilledCost.toFixed(4))
    };
  }
  
  return {
    providerCost: Number(ffmpegProviderCost.toFixed(4)),
    billedCost: Number(ffmpegBilledCost.toFixed(4))
  };
}

/**
 * Calcula el costo de TTS por caracteres.
 */
export async function calculateTTSCost(characters: number, voiceId: string = 'mateo'): Promise<CostBreakdown> {
  const pricingSnap = await adminDb.collection('config').doc('ai_pricing').get();
  const pricing = pricingSnap.data() || {};
  
  // Voces gratuitas (Edge TTS)
  const freeVoices = ['mateo', 'elena', 'carlos'];
  const isFree = freeVoices.includes(voiceId.toLowerCase());

  if (isFree) {
    // Es gratuito, el proveedor no nos cobra y no le cobramos al tutor.
    return { providerCost: 0, billedCost: 0 };
  }

  // Voces pagas (Google/ElevenLabs)
  const baseCost = pricing.ttsPricePerMillionChars || 15;
  const markup = pricing.ttsMarkupPercentage || 40;

  const rawProviderCost = (characters / 1000000) * baseCost;
  const pricePerMillion = baseCost * (1 + markup / 100);
  const rawBilledCost = (characters / 1000000) * pricePerMillion;
  
  return {
    providerCost: Number(rawProviderCost.toFixed(5)),
    billedCost: Number(rawBilledCost.toFixed(5))
  };
}

/**
 * Calcula el costo de generación de imágenes (SDXL).
 */
export async function calculateImageCost(count: number = 1): Promise<CostBreakdown> {
  const pricingSnap = await adminDb.collection('config').doc('ai_pricing').get();
  const pricing = pricingSnap.data() || {};
  
  const baseCost = pricing.imagePricePerHundred || 3;
  const markup = pricing.imageMarkupPercentage || 50;

  const rawProviderCost = (count / 100) * baseCost;
  const pricePer100 = baseCost * (1 + markup / 100);
  const rawBilledCost = (count / 100) * pricePer100;
  
  return {
    providerCost: Number(rawProviderCost.toFixed(4)),
    billedCost: Number(rawBilledCost.toFixed(4))
  };
}

/**
 * Deduce créditos y registra la auditoría según el ROL.
 */
export async function deductCredits(
  uid: string, 
  amountOrBreakdown: number | CostBreakdown, 
  action: string, 
  contextRole: string = 'mentor',
  ownerUid?: string
) {
  try {
    const batch = adminDb.batch();
    const targetUid = ownerUid || uid;
    const isReferential = !!ownerUid && ownerUid !== uid;

    // Resolve billed cost vs provider cost
    const amount = typeof amountOrBreakdown === 'number' ? amountOrBreakdown : amountOrBreakdown.billedCost;
    const providerCost = typeof amountOrBreakdown === 'number' ? 0 : amountOrBreakdown.providerCost;
    const profit = amount - providerCost;

    // 1. Auditoría Global (Auto-borrado en 90 días via TTL)
    const auditRef = adminDb.collection('ai_audit_logs').doc();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (90 * 24 * 60 * 60 * 1000)); // +90 días

    batch.set(auditRef, {
      actorUid: uid,
      targetUid: targetUid,
      role: contextRole,
      action: action,
      amount: amount,
      providerCost: providerCost,
      profit: profit,
      isReferential: isReferential,
      timestamp: FieldValue.serverTimestamp(),
      expiresAt: expiresAt // Google borrará esto gratis en 90 días
    });

    // 2. Registro en el historial del usuario (Visible para ellos, auto-borrado en 90 días)
    const transactionsRef = adminDb.collection('users').doc(uid).collection('ai_transactions');
    batch.set(transactionsRef.doc(), {
      amount,
      action,
      role: contextRole,
      isReferential,
      timestamp: FieldValue.serverTimestamp(),
      expiresAt: expiresAt
    });

    // 3. Cobro real
    if (contextRole === 'admin' && !ownerUid) {
      // Los administradores no pagan por su propio consumo personal
      console.log(`>>> [BILLING] Consumo de Admin (Gratis): ${action}`);
    } else {
      const targetRef = adminDb.collection('users').doc(targetUid);
      const userSnap = await targetRef.get();
      const userData = userSnap.data();
      
      const subQuotas = userData?.subscription?.aiQuotas;
      const subAvailable = subQuotas ? (subQuotas.totalCredits || 0) - (subQuotas.usedCredits || 0) : 0;

      if (subAvailable >= amount) {
        // Prioridad 1: Suscripción
        batch.update(targetRef, {
          'subscription.aiQuotas.usedCredits': FieldValue.increment(amount),
          'credits.lastUsed': FieldValue.serverTimestamp()
        });
      } else {
        // Prioridad 2: Saldo Extra
        batch.update(targetRef, {
          'credits.balance': FieldValue.increment(-amount),
          'credits.lastUsed': FieldValue.serverTimestamp()
        });
      }

      if (isReferential) {
        // Opcional: Trackear cuánto le ha costado este mentor a la plataforma vía alumnos
        batch.update(targetRef, {
          'credits.referentialUsage': FieldValue.increment(amount)
        });
      }
    }

    await batch.commit();
    return true;
  } catch (error) {
    console.error('[Billing] Error:', error);
    return false;
  }
}

/**
 * Verifica si un usuario tiene saldo suficiente.
 */
export async function checkSufficientCredits(uid: string, requiredAmount: number, contextRole: string = 'mentor'): Promise<{ ok: boolean, balance: number }> {
  try {
    const userSnap = await adminDb.collection('users').doc(uid).get();
    const userData = userSnap.data();
    
    // 1. Saldo de Suscripción (aiQuotas)
    const subQuotas = userData?.subscription?.aiQuotas;
    const subBalance = subQuotas ? (subQuotas.totalCredits || 0) - (subQuotas.usedCredits || 0) : 0;

    // 2. Saldo de Recargas (Pay-As-You-Go)
    const extraBalance = userData?.credits?.balance || 0;

    const totalBalance = subBalance + extraBalance;

    console.log(`>>> [DEBUG BILLING] Verificando Saldo para UID: ${uid}`);
    console.log(`>>> [DEBUG BILLING] Saldo Sub: ${subBalance} | Saldo Extra: ${extraBalance}`);
    console.log(`>>> [DEBUG BILLING] Total Disponible: ${totalBalance}`);

    return {
      ok: totalBalance >= requiredAmount,
      balance: totalBalance
    };
  } catch (error: any) {
    console.error('[Billing] Error al verificar saldo:', error);
    
    // Bypass for local development without service account
    if (process.env.NODE_ENV === 'development' && error?.message?.includes('credentials')) {
      console.warn('[Billing] Bypassing credit check for local development');
      return { ok: true, balance: 9999 };
    }
    
    // In production, fallback to allowing if we get a permission/credential error from server-side missing ADC, 
    // but usually we want to fail secure. For this case we'll allow it locally unconditionally to fix the dev error.
    if (process.env.NODE_ENV === 'development') {
       return { ok: true, balance: 9999 };
    }

    return { ok: false, balance: 0 };
  }
}
