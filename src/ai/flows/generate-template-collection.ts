'use server';
/**
 * @fileOverview Flujo de Genkit para generar colección de templates
 * Utiliza el modelo predeterminado configurado en el núcleo de Genkit
 * Incluye validación y pre-conformación para APIs externas
 */

import { ai, validateApiKey } from '../genkit';
import { z } from 'genkit';
import { 
  validateAdsTemplates
} from '@/lib/template-validator';
import { analyzeColorSimilarity, generateColorRecommendations } from '@/lib/color-matcher';

const DesignTokensSchema = z.object({
  primary: z.string().describe('Color primario (Hex)'),
  secondary: z.string().describe('Color fondo (Hex)'),
  accent: z.string().describe('Color acento (Hex)'),
  fontHeading: z.string().describe('Fuente para titulares (Heading)'),
  fontBody: z.string().describe('Fuente para cuerpo de texto (Body)'),
});

const LandingVariantSchema = z.object({
  type: z.enum(['minimal', 'balanced', 'detailed']),
  themeMode: z.enum(['light', 'dark', 'glass']).default('light').describe('Modo de color predominante para esta variante de landing.'),
  designTokens: DesignTokensSchema,
  headline: z.string(),
  subheadline: z.string(),
  ctaText: z.string(),
  sectionCount: z.number().describe('Cantidad de secciones narrativas clásicas.'),
  visibility: z.object({
    showHeroVideo: z.boolean().default(true),
    showNarrative: z.boolean().default(true),
    showSyllabus: z.boolean().default(true),
    showBenefits: z.boolean().default(true),
    showMentor: z.boolean().default(true),
    showFaqs: z.boolean().default(true),
  }).default({
    showHeroVideo: true,
    showNarrative: true,
    showSyllabus: true,
    showBenefits: true,
    showMentor: true,
    showFaqs: true,
  }).describe('Configuración de visibilidad de las secciones de la landing'),
  faqs: z.array(z.object({
    question: z.string(),
    answer: z.string()
  })).optional().describe('Preguntas frecuentes para derribar objeciones')
});

const EmailVariantSchema = z.object({
  type: z.enum(['direct', 'storytelling', 'benefits']),
  designTokens: DesignTokensSchema,
  subject: z.string(),
  body: z.string(),
  preheader: z.string(),
});

const AdsVariantSchema = z.object({
  type: z.enum(['search', 'visual', 'retargeting']),
  designTokens: DesignTokensSchema,
  headlines: z.array(z.string()).optional().describe('Slots para titulares. (Opcional)'),
  descriptions: z.array(z.string()).optional().describe('Slots para descripciones. (Opcional)'),
  keywords: z.array(z.string()).optional(),
});

const CollectionInputSchema = z.object({
  directives: z.string().describe('Directivas estratégicas del mentor.'),
  mentorName: z.string().optional(),
  designTokens: DesignTokensSchema.describe('Tokens de diseño seleccionados por el usuario'),
  enabledChannels: z.object({
    landings: z.boolean(),
    emails: z.boolean(),
    ads: z.boolean(),
  }),
});
export type CollectionInput = z.infer<typeof CollectionInputSchema>;

const CollectionOutputSchema = z.object({
  landings: z.array(LandingVariantSchema).optional(),
  emails: z.array(EmailVariantSchema).optional(),
  ads: z.array(AdsVariantSchema).optional(),
  validationMetadata: z.object({
    colorAnalysis: z.any().optional(),
    recommendations: z.any().optional(),
    preconformedResults: z.any().optional(),
    validatedAt: z.string().optional(),
    error: z.string().optional(),
    fallbackMode: z.boolean().optional()
  }).optional()
});
export type CollectionOutput = z.infer<typeof CollectionOutputSchema>;

export async function generateTemplateCollection(input: CollectionInput): Promise<CollectionOutput> {
  // Validar API key antes de procesar
  console.log('🔍 [Templates] Validando API key...');
  try {
    validateApiKey();
    console.log('✅ [Templates] API key validada');
  } catch (e: any) {
    console.error('❌ [Templates] API key no disponible:', e.message);
    throw new Error('No se pudo conectar con Gemini: ' + (e?.message || e));
  }
  
  try {
    return await generateTemplateCollectionFlow(input);
  } catch (error: any) {
    console.error("[Flow Error: GenerateTemplate]", error);
    throw new Error(error.message || "Error al generar la colección de templates.");
  }
}

const generateTemplateCollectionFlow = ai.defineFlow(
  {
    name: 'generateTemplateCollectionFlow',
    inputSchema: CollectionInputSchema,
    outputSchema: CollectionOutputSchema,
  },
  async (input) => {
    // El flujo utiliza el modelo predeterminado para asegurar compatibilidad
    const { output } = await ai.generate({
      prompt: `Actúa como un Director de Arte y Arquitecto de Marketing Digital. Tu tarea es generar un "Blueprint de Identidad" multicanal.

IDENTIDAD VISUAL SELECCIONADA (USA ESTOS COLORES OBLIGATORIAMENTE):
- Color Primario: ${input.designTokens.primary}
- Color Secundario: ${input.designTokens.secondary} 
- Color Acento: ${input.designTokens.accent}
- Fuente Títulos: ${input.designTokens.fontHeading}
- Fuente Cuerpo: ${input.designTokens.fontBody}

¡IMPORTANTE! DEBES USAR EXACTAMENTE ESTOS COLORES EN TODOS LOS TEMPLATES.

FILTRO DE GENERACIÓN (Solo genera para estos canales):
- Landings: ${input.enabledChannels.landings ? 'HABILITADO (3 variantes: Minimal, Balanced, Detailed)' : 'DESACTIVADO'}
- Emails: ${input.enabledChannels.emails ? 'HABILITADO (3 variantes)' : 'DESACTIVADO'}
- Ads: ${input.enabledChannels.ads ? 'HABILITADO (3 variantes: Search, Visual, Retargeting)' : 'DESACTIVADO'}

REGLAS DE CONTENIDO (PARA LLENAR EN SIGUIENTE ETAPA):
- Para landings: sectionCount es obligatorio. DEBES incluir "themeMode" (varía entre light, dark y glass para dar estilos visuales únicos). DEBES incluir de 3 a 5 "faqs" para derribar objeciones (ej: conocimientos previos, duración, garantías). El objeto "visibility" debe tener todos sus flags en true por defecto.
- Para emails: subject, body, preheader son obligatorios
- NO generes URLs, imágenes, o contenido multimedia.

INSTRUCCIÓN FINAL CRÍTICA:
Asegúrate de que la cantidad de elementos devueltos en los arrays corresponda FIELMENTE a los números exactos requeridos. ¡Crea múltiples ítems si el número es mayor a 1!
Devuelve un objeto JSON estructurado con DATOS COMPLETOS.`,
      output: { schema: CollectionOutputSchema },
      config: { 
        temperature: 0.7,
        maxOutputTokens: 8192 
      }
    });

    if (!output) throw new Error('Fallo al generar el blueprint multicanal.');

    // 🔍 VALIDACIÓN Y PRE-CONFORMACIÓN PARA APIs EXTERNAS
    console.log('🔍 Iniciando validación y pre-conformación para APIs externas...');
    
    try {
      // Extraer design tokens del primer template disponible
      const firstTemplate = output.landings?.[0] || output.emails?.[0] || output.ads?.[0];
      const designTokens = firstTemplate?.designTokens;

      if (designTokens) {
        console.log('🎨 Design Tokens detectados:', designTokens);
        
        // Analizar compatibilidad de colores
        const colorAnalysis = analyzeColorSimilarity(designTokens.primary, ['twitter', 'instagram', 'linkedin', 'tiktok']);
        console.log('📊 Análisis de compatibilidad de colores:', colorAnalysis);

        // Generar recomendaciones
        const recommendations = generateColorRecommendations(designTokens.primary, ['twitter', 'instagram', 'linkedin', 'tiktok']);
        console.log('💡 Recomendaciones de ajuste:', recommendations);

        // ✅ VALIDACIÓN INDIVIDUAL POR RED SOCIAL
        const validatedResults: any = {
          landings: output.landings || [], // ✅ Sin validación - usan colores originales
          emails: output.emails || [],     // ✅ Sin validación - usan colores originales
          ads: []                          // ✅ Se validará con función específica
        };

        // ✅ VALIDAR ADS CON FUNCIÓN ESPECÍFICA
        if (output.ads && output.ads.length > 0) {
          console.log('🔍 Validando ads individualmente...');
          
          const adsValidated = await validateAdsTemplates(output.ads, designTokens);
          validatedResults.ads = adsValidated;
        }

        console.log('✅ Validación individual completada:', validatedResults);

        // Enriquecer output con metadatos de validación
        const enrichedOutput = {
          landings: validatedResults.landings,
          emails: validatedResults.emails,
          ads: validatedResults.ads,
          validationMetadata: {
            colorAnalysis,
            recommendations,
            validatedResults,
            validatedAt: new Date().toISOString(),
            validationType: 'individual_by_platform'
          }
        };

        return enrichedOutput;
      }

      return output;
    } catch (validationError: any) {
      console.error('❌ Error en validación de APIs:', validationError);
      console.log('⚠️ Continuando con templates sin pre-conformación...');
      
      // ✅ CORRECCIÓN: Validar que validationError exista antes de acceder a message
      const errorMessage = validationError?.message || validationError?.toString() || "Error desconocido en validación";
      
      // Devolver output original aunque falle la validación
      return {
        ...output,
        validationMetadata: {
          error: errorMessage,
          fallbackMode: true,
          validatedAt: new Date().toISOString()
        }
      };
    }
  }
);
