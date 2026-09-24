import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { checkSufficientCredits, calculateGeminiCost, calculateEmbeddingCost, deductCredits } from '@/lib/payments/credits';

/**
 * Motor Genkit Original con Sensor de Identidad BTECH
 */
/**
 * Motor Genkit Original (Instancia interna)
 */
let _genkitInstance: any = null;

function getGenkitInstance() {
  if (!_genkitInstance) {
    _genkitInstance = genkit({
      plugins: [
        googleAI({
          apiKey: process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY || 'DUMMY_KEY_FOR_BUILD'
        }),
      ],
      model: 'googleai/gemini-2.5-flash',
      config: {
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        ]
      }
    } as any);
  }
  return _genkitInstance;
}

/**
 * Proxy Global: Intercepta todas las llamadas a ai.generate() para auditarlas automáticamente.
 */
export const ai: any = new Proxy({}, {
  get(target, prop, receiver) {
    if (prop === 'generate') {
      return (...args: any[]) => (generateWithAuditing as any)(...args);
    }
    if (prop === 'embed') {
      return (...args: any[]) => (embedWithAuditing as any)(...args);
    }
    const instance = getGenkitInstance();
    const value = Reflect.get(instance, prop, receiver);
    return typeof value === 'function' ? value.bind(instance) : value;
  }
});

/**
 * Proxy Secundario: Mantiene las trazas de observabilidad pero omite explícitamente el cobro de saldo.
 */
export const aiUnbilled: any = new Proxy({}, {
  get(target, prop, receiver) {
    if (prop === 'generate') {
      // Pasamos un flag en las opciones para saltar la validación y deducción de créditos
      return (options: any, actionName?: string, ownerUid?: string) => 
        (generateWithAuditing as any)({ ...options, skipBilling: true }, actionName, ownerUid);
    }
    const instance = getGenkitInstance();
    const value = Reflect.get(instance, prop, receiver);
    return typeof value === 'function' ? value.bind(instance) : value;
  }
});

/**
 * Verifica que las API keys críticas estén disponibles.
 */
export function validateAiConfig() {
  const genaiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY;
  const ttsKey = process.env.GOOGLE_TTS_API_KEY;

  if (!genaiKey) {
    console.error('[Genkit] ERROR: API key de Gemini no configurada.');
    throw new Error('Servicio de IA no disponible (Falta GOOGLE_GENAI_API_KEY)');
  }

  return { has_genai: !!genaiKey, has_tts: !!ttsKey };
}

export function validateApiKey(): string {
  validateAiConfig();
  return (process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY)!;
}

/**
 * Wrapper Universal de Auditoría.
 * Este es el "Cerebro" que identifica al usuario y le cobra.
 */
export async function generateWithAuditing(options: any, actionName: string = 'ia_generation', ownerUid: string | null = null) {
  let uid = '';
  let role = 'alumno';
  const finalActionName = options.actionName || actionName;

  // Sensor de Identidad (Cookies)
  try {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    uid = cookieStore.get('btech_uid')?.value || '';
    role = cookieStore.get('btech_role')?.value || 'alumno';
    
    console.log(`>>> [AUDIT] Identidad detectada: UID=${uid}, ROLE=${role}, ACCION=${finalActionName}`);
  } catch (e: any) {
    console.warn("[Sensor IA] Aviso: Ejecución sin contexto de identidad.");
  }

  if (role === 'alumno' && !ownerUid) {
    throw new Error('ACCESO_DENEGADO: Las acciones de IA de los alumnos requieren un tutor asociado (ownerUid) para facturación.');
  }

  const targetUidToCheck = ownerUid || uid;
  const roleToCheck = ownerUid ? 'mentor' : role; // If it's delegated, we treat the owner as a mentor (paying)

  // 1. Verificar saldo
  if (!options.skipBilling && targetUidToCheck && (roleToCheck === 'mentor' || roleToCheck === 'marketing')) {
    const minRequired = 0.001; 
    const { ok, balance } = await checkSufficientCredits(targetUidToCheck, minRequired, roleToCheck);
    if (!ok) {
      throw new Error(`SALDO_INSUFICIENTE: Tu cuenta (o la del tutor) se ha quedado sin créditos de IA (Saldo actual: ${balance}). Por favor, dirígete a la pestaña "Suscripción" en el panel lateral para recargar saldo y continuar.`);
    }
  }

  // 2. Ejecutar la IA (Usando la instancia interna para evitar recursión infinita)
  const generateOptions = { ...options };
  generateOptions.context = {
    ...(generateOptions.context || {}),
    uid,
    role
  };

  const response = await getGenkitInstance().generate(generateOptions);

  // 3. Auditoría Silenciosa (No bloquea la IA si falla)
  if (uid && response.usage) {
    try {
      const tokens = response.usage.totalTokens || 0;
      const cost = await calculateGeminiCost(tokens);
      
      console.log("--- [DEBUG IA] AUDITORÍA AUTOMÁTICA ---");
      console.log(`> Usuario: ${uid} (${role})`);
      if (ownerUid) console.log(`> Referenciado a (Owner): ${ownerUid}`);
      console.log(`> Acción Detectada: ${finalActionName}`);
      console.log(`> Tokens: ${tokens}`);
      console.log(`> Costo Proveedor: $${cost.providerCost}`);
      console.log(`> Cobro al Tutor: $${options.skipBilling ? 0 : cost.billedCost} ${options.skipBilling ? '(SKIP BILLING)' : ''}`);
      console.log("---------------------------------------");

      if (!options.skipBilling) {
        deductCredits(uid, cost, finalActionName, role, ownerUid || undefined);
      }
    } catch (e) {
      console.error("[Sensor IA] Error al registrar consumo:", e);
    }
  }

  return response;
}

/**
 * Wrapper de Auditoría para Embeddings.
 * Estima los tokens procesados y cobra una fracción simbólica.
 */
export async function embedWithAuditing(options: any, actionName: string = 'ia_embedding', ownerUid: string | null = null) {
  let uid = '';
  let role = 'alumno';
  const finalActionName = options.actionName || actionName;

  try {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    uid = cookieStore.get('btech_uid')?.value || '';
    role = cookieStore.get('btech_role')?.value || 'alumno';
  } catch (e: any) { }

  if (role === 'alumno' && !ownerUid) {
    throw new Error('ACCESO_DENEGADO: Las acciones de IA de los alumnos requieren un tutor asociado (ownerUid) para facturación.');
  }

  const targetUidToCheck = ownerUid || uid;
  const roleToCheck = ownerUid ? 'mentor' : role;

  if (targetUidToCheck && (roleToCheck === 'mentor' || roleToCheck === 'marketing')) {
    const minRequired = 0.0001; 
    const { ok, balance } = await checkSufficientCredits(targetUidToCheck, minRequired, roleToCheck);
    if (!ok) {
      throw new Error(`SALDO_INSUFICIENTE: Tu cuenta (o la del tutor) se ha quedado sin créditos de IA (Saldo actual: ${balance}).`);
    }
  }

  const response = await getGenkitInstance().embed(options);

  if (uid) {
    try {
      const contentStr = typeof options.content === 'string' ? options.content : JSON.stringify(options.content || '');
      const estimatedTokens = Math.ceil((contentStr.length || 0) / 4);
      const cost = await calculateEmbeddingCost(estimatedTokens);
      
      console.log("--- [DEBUG IA] AUDITORÍA AUTOMÁTICA (EMBEDDING) ---");
      console.log(`> Usuario: ${uid} (${role})`);
      if (ownerUid) console.log(`> Referenciado a (Owner): ${ownerUid}`);
      console.log(`> Acción Detectada: ${finalActionName}`);
      console.log(`> Tokens Estimados: ${estimatedTokens}`);
      console.log(`> Costo Proveedor: $${cost.providerCost}`);
      console.log(`> Cobro al Tutor: $${cost.billedCost}`);
      console.log("---------------------------------------------------");

      deductCredits(uid, cost, finalActionName, role, ownerUid || undefined);
    } catch (e) {
      console.error("[Sensor IA] Error al registrar consumo de embedding:", e);
    }
  }

  return response;
}
