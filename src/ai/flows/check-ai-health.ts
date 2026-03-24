
'use server';
/**
 * @fileOverview Diagnóstico de salud del motor de IA utilizando Gemini 1.5 Flash.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const HealthOutputSchema = z.object({
  status: z.enum(['ok', 'error']),
  message: z.string().optional(),
  details: z.string().optional()
});

/**
 * Valida la conectividad con el modelo Gemini 1.5 Flash mediante una llamada minimalista.
 */
export async function checkAiHealth(): Promise<z.infer<typeof HealthOutputSchema>> {
  try {
    // Intento de generación mínima
    const response = await ai.generate({
      prompt: 'Responde únicamente con la palabra: ONLINE',
      config: { 
        temperature: 0.1
      }
    });
    if (response && response.text) {
      return { 
        status: 'ok', 
        message: 'Conexión Exitosa',
        details: `El motor está operando correctamente con Gemini 2.5 Flash. Respuesta: ${response.text}`
      };
    }
    
    throw new Error("El servidor de Google no devolvió texto.");

  } catch (e: any) {
    console.error("[IA Health Check Failure]", e);
    
    let errorDetail = e.message || 'Error desconocido.';
    let friendlyMessage = 'Fallo de Conectividad';

    // Análisis específico del error 404
    if (e.message?.includes('404')) {
      errorDetail = 'Error 404: El servidor de Google no reconoce el modelo en esta ruta. Esto suele suceder si el proyecto de Google Cloud tiene restricciones regionales o si el modelo específico no está disponible para tu tipo de clave.';
    } else if (e.message?.includes('403')) {
      errorDetail = 'Error 403: La API Key no tiene permisos suficientes para realizar esta operación o la Generative Language API está desactivada.';
    }

    return { 
      status: 'error', 
      message: friendlyMessage, 
      details: errorDetail
    };
  }
}
