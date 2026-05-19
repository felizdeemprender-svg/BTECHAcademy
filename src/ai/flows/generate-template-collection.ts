'use server';
/**
 * @fileOverview Flujo de Genkit para generar colección de templates
 * Utiliza el modelo predeterminado configurado en el núcleo de Genkit
 * Incluye validación y pre-conformación para APIs externas
 */

import { ai, validateApiKey } from '../genkit';
import { z } from 'genkit';
import { 
  validateTwitterTemplates,
  validateInstagramTemplates,
  validateLinkedInTemplates,
  validateTikTokTemplates,
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
  designTokens: DesignTokensSchema,
  headline: z.string(),
  subheadline: z.string(),
  ctaText: z.string(),
  sectionCount: z.number().describe('Cantidad de secciones: Minimal(1-3), Balanced(3-5), Detailed(5-7).'),
});

const EmailVariantSchema = z.object({
  type: z.enum(['direct', 'storytelling', 'benefits']),
  designTokens: DesignTokensSchema,
  subject: z.string(),
  body: z.string(),
  preheader: z.string(),
});

const BlueprintConfigSchema = z.object({
  presetId: z.enum(['01', '02', '03', '04', '05']).describe('ID del preset visual universal (01: Auth, 02: Glass, 03: Kinetic, 04: Dark, 05: Impact)'),
  resolution: z.string().default('1080x1920').describe('Resolución o aspecto técnico.'),
  fps: z.union([z.literal(30), z.literal(60)]).default(30),
  sceneCount: z.number().optional().describe('Cantidad de escenas (video) o bloques principales.'),
  totalDuration: z.number().optional().describe('Duración total (seg) o tiempo de lectura estimado.'),
  slideCount: z.number().optional().describe('Cantidad de placas o tweets (para formatos estáticos).'),
  strategyVector: z.string().optional().describe('Vector psicológico específico para esta pieza.'),
  commercialTone: z.string().optional().describe('Tono comercial específico para esta pieza.'),
});

const SocialVariantSchema = z.object({
  platform: z.enum(['instagram', 'linkedin', 'twitter', 'tiktok']),
  type: z.enum(['story', 'carousel', 'single_post', 'thread', 'short_video', 'document']),
  designTokens: DesignTokensSchema,
  hook: z.string().describe('Estructura del gancho inicial.'),
  caption: z.string().describe('Estructura del cuerpo del post.'),
  hashtags: z.array(z.string()).optional().describe('Array de hashtags opcional.'),
  slideCount: z.number().optional().describe('Cantidad de placas, tweets o fragmentos según plataforma.'),
  blueprintConfig: BlueprintConfigSchema.optional().describe('Configuración técnica universal del Evo Social Lab.'),
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
    socials: z.boolean(),
    ads: z.boolean(),
  }),
  platforms: z.object({
    twitter: z.object({ enabled: z.boolean(), thread: z.number().optional(), single_post: z.number().optional() }).optional(),
    instagram: z.object({ enabled: z.boolean(), story: z.number().optional(), carousel: z.number().optional(), single_post: z.number().optional() }).optional(),
    tiktok: z.object({ enabled: z.boolean(), short_video: z.number().optional(), carousel: z.number().optional() }).optional(),
    linkedin: z.object({ enabled: z.boolean(), document: z.number().optional(), single_post: z.number().optional(), carousel: z.number().optional() }).optional(),
  }).optional(),
});
export type CollectionInput = z.infer<typeof CollectionInputSchema>;

const CollectionOutputSchema = z.object({
  landings: z.array(LandingVariantSchema).optional(),
  emails: z.array(EmailVariantSchema).optional(),
  socials: z.array(SocialVariantSchema).optional(),
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
- Redes Sociales: ${input.enabledChannels.socials ? 'HABILITADO' : 'DESACTIVADO'}

¡REGLA ABSOLUTA DE CANTIDADES MULTIPLICADORAS! (Si "socials" está activado):
DEBES generar EXACTAMENTE los objetos que se indican a continuación en el array "socials". NO puedes generar menos. Si te pido 5 stories, debes crear 5 objetos INDEPENDIENTES y distitintos tipo "story". 

- Twitter: ${input.platforms?.twitter?.enabled ? `Generar EXACTAMENTE -> ${input.platforms.twitter.thread || 0} hilos [type="thread"] y ${input.platforms.twitter.single_post || 0} tweets [type="single_post"]` : 'OMITIR TWITTER'}
- Instagram: ${input.platforms?.instagram?.enabled ? `Generar EXACTAMENTE -> ${input.platforms.instagram.story || 0} stories [type="story"], ${input.platforms.instagram.carousel || 0} carruseles [type="carousel"] y ${input.platforms.instagram.single_post || 0} fotos de muro [type="single_post"]` : 'OMITIR INSTAGRAM'}
- TikTok: ${input.platforms?.tiktok?.enabled ? `Generar EXACTAMENTE -> ${input.platforms.tiktok.short_video || 0} videos cortos [type="short_video"] y ${input.platforms.tiktok.carousel || 0} carruseles [type="carousel"]` : 'OMITIR TIKTOK'}
- LinkedIn: ${input.platforms?.linkedin?.enabled ? `Generar EXACTAMENTE -> ${input.platforms.linkedin.document || 0} posts de documento [type="document"], ${input.platforms.linkedin.single_post || 0} posts de autoridad [type="single_post"], y ${input.platforms.linkedin.carousel || 0} carruseles [type="carousel"]` : 'OMITIR LINKEDIN'}

CONFIGURACIÓN DE ESCENAS Y BLUEPRINTS (blueprintConfig):
Mucha atención aquí. En los objetos generados de socials debes incluir el "blueprintConfig" aplicando estas reglas sin falta:
1. Para formatos de Video (Instagram story, TikTok short_video): DEBES incluir "sceneCount" (ej: generar de 3 a 5 escenas para el blueprint de las historias). Resolution "1080x1920".
2. Para formatos Múltiples (carruseles y documentos en Instagram, LinkedIn o TikTok): DEBES incluir "slideCount" (ej: de 3 a 7 slides). Resolution "1080x1350".
3. Para formatos Simples (single_post, thread): "slideCount": 1. Resolution "1080x1080".

REGLAS DE CONTENIDO VACÍO (PARA LLENAR EN SIGUIENTE ETAPA):
- Para landings: sectionCount es obligatorio (ej. 3 a 6)
- Para emails: subject, body, preheader son obligatorios
- Para socials: hook y caption son obligatorios. blueprintConfig (con sus escenas y placas) es REQUERIDO y fundamental.
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
      const firstTemplate = output.landings?.[0] || output.emails?.[0] || output.socials?.[0] || output.ads?.[0];
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
          socials: [],                    // ✅ Se validará individualmente por plataforma
          ads: []                         // ✅ Se validará individualmente por plataforma
        };

        // ✅ VALIDAR CADA RED SOCIAL INDIVIDUALMENTE
        if (output.socials && output.socials.length > 0) {
          console.log('🔍 Validando social media individualmente...');
          
          // Agrupar socials por plataforma
          const socialsByPlatform = {
            twitter: output.socials.filter(s => s.platform === 'twitter'),
            instagram: output.socials.filter(s => s.platform === 'instagram'),
            linkedin: output.socials.filter(s => s.platform === 'linkedin'),
            tiktok: output.socials.filter(s => s.platform === 'tiktok')
          };

          // Validar cada plataforma con su función específica
          if (socialsByPlatform.twitter.length > 0) {
            console.log(`🔍 Validando Twitter (${socialsByPlatform.twitter.length} templates)...`);
            const twitterValidated = await validateTwitterTemplates(socialsByPlatform.twitter, designTokens);
            validatedResults.socials.push(...twitterValidated);
          }

          if (socialsByPlatform.instagram.length > 0) {
            console.log(`🔍 Validando Instagram (${socialsByPlatform.instagram.length} templates)...`);
            const instagramValidated = await validateInstagramTemplates(socialsByPlatform.instagram, designTokens);
            validatedResults.socials.push(...instagramValidated);
          }

          if (socialsByPlatform.linkedin.length > 0) {
            console.log(`🔍 Validando LinkedIn (${socialsByPlatform.linkedin.length} templates)...`);
            const linkedinValidated = await validateLinkedInTemplates(socialsByPlatform.linkedin, designTokens);
            validatedResults.socials.push(...linkedinValidated);
          }

          if (socialsByPlatform.tiktok.length > 0) {
            console.log(`🔍 Validando TikTok (${socialsByPlatform.tiktok.length} templates)...`);
            const tiktokValidated = await validateTikTokTemplates(socialsByPlatform.tiktok, designTokens);
            validatedResults.socials.push(...tiktokValidated);
          }
        }

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
          socials: validatedResults.socials,
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
