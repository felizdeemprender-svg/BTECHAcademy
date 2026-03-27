'use server';
/**
 * @fileOverview Flujo de Genkit para generar colección de templates
 * Utiliza el modelo predeterminado configurado en el núcleo de Genkit
 * Incluye validación y pre-conformación para APIs externas
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { validateAndPreconformTemplates } from '@/lib/template-validator';
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

const SocialVariantSchema = z.object({
  platform: z.enum(['instagram', 'linkedin', 'twitter', 'tiktok']),
  type: z.enum(['story', 'carousel', 'single_post', 'thread', 'short_video', 'document']),
  designTokens: DesignTokensSchema,
  hook: z.string().describe('Estructura del gancho inicial.'),
  caption: z.string().describe('Estructura del cuerpo del post.'),
  hashtags: z.array(z.string()),
  slideCount: z.number().optional().describe('Cantidad de placas, tweets o fragmentos según plataforma.'),
});

const AdsVariantSchema = z.object({
  type: z.enum(['search', 'visual', 'retargeting']),
  designTokens: DesignTokensSchema,
  headlines: z.array(z.string()).describe('Slots para titulares.'),
  descriptions: z.array(z.string()).describe('Slots para descripciones.'),
  keywords: z.array(z.string()).optional(),
});

const CollectionInputSchema = z.object({
  directives: z.string().describe('Directivas estratégicas del mentor.'),
  mentorName: z.string().optional(),
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

FILTRO DE GENERACIÓN (Solo genera para estos canales):
- Landings: ${input.enabledChannels.landings ? 'HABILITADO (3 variantes: Minimal, Balanced, Detailed)' : 'DESACTIVADO'}
- Emails: ${input.enabledChannels.emails ? 'HABILITADO (3 variantes)' : 'DESACTIVADO'}
- Ads: ${input.enabledChannels.ads ? 'HABILITADO (3 variantes: Search, Visual, Retargeting)' : 'DESACTIVADO'}
- Redes Sociales: ${input.enabledChannels.socials ? 'HABILITADO' : 'DESACTIVADO'}

SI LAS REDES SOCIALES ESTÁN HABILITADAS, ESTAS SON LAS CUOTAS EXACTAS QUE DEBES GENERAR (¡No te desvíes!):
- Twitter: ${input.platforms?.twitter?.enabled ? `SÍ -> (Genera EXACTAMENTE ${input.platforms.twitter.thread || 0} hilos [type="thread"] y ${input.platforms.twitter.single_post || 0} tweets [type="single_post"])` : 'NO'}
- Instagram: ${input.platforms?.instagram?.enabled ? `SÍ -> (Genera EXACTAMENTE ${input.platforms.instagram.story || 0} stories [type="story"], ${input.platforms.instagram.carousel || 0} carruseles [type="carousel"] y ${input.platforms.instagram.single_post || 0} fotos de muro [type="single_post"])` : 'NO'}
- TikTok: ${input.platforms?.tiktok?.enabled ? `SÍ -> (Genera EXACTAMENTE ${input.platforms.tiktok.short_video || 0} videos cortos [type="short_video"] y ${input.platforms.tiktok.carousel || 0} carruseles fotográficos [type="carousel"])` : 'NO'}
- LinkedIn: ${input.platforms?.linkedin?.enabled ? `SÍ -> (Genera EXACTAMENTE ${input.platforms.linkedin.document || 0} posts de documento [type="document"], ${input.platforms.linkedin.single_post || 0} posts de autoridad [type="single_post"], y ${input.platforms.linkedin.carousel || 0} carruseles [type="carousel"])` : 'NO'}

REGLAS ESPECÍFICAS DE COPYWRITING Y DISEÑO:
1. LANDINGS (Sitios Web): Genera Títulos (Headlines) CORTOS, persuasivos y orientados a conversión (máximo 8 palabras). El subheadline debe ser un subtítulo directo (1-2 líneas). ¡COMPLETAMENTE PROHIBIDO usar saludos de carta o estilo email ("Hola", "Espero que")!
2. EMAILS: Son correos conversacionales. Usa Asuntos intrigantes y Cuerpos de texto (Body) persuasivos que desarrollen una historia o beneficio, con saludo y despedida.
3. ADS & SOCIALS: Redacta ganchos (hooks) directos y textos asertivos optimizados para capturar atención en segundos.
4. TOKENS: Define tokens de diseño coherentes (primary, secondary, accent, fontHeading, fontBody) para cada estilo.
5. TONO: Basa todo el ADN en las directivas del usuario: "${input.directives}".

Devuelve un objeto JSON estructurado que contenga exclusivamente los arrays de los canales habilitados.`,
      output: { schema: CollectionOutputSchema },
      config: { 
        temperature: 0.7,
        maxOutputTokens: 8192 
      }
    });

    if (!output) throw new Error('Fallo al generar el blueprint multicanal.');

    // 🔍 VALIDACIÓN Y PRE-CONFORMACIÓN PARA APIs
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

        // Validar y pre-conformar templates
        const templatesToValidate = [
          output.landings || [],
          output.emails || [],
          output.socials || [],
          output.ads || []
        ];

        const platforms = ['landing', 'email', 'social', 'ads'];
        const designTokensMap = templatesToValidate.map(templates => 
          templates.length > 0 ? designTokens : {}
        );

        console.log('🚀 Iniciando pre-conformación masiva de templates...');
        const preconformedResults = await validateAndPreconformTemplates(
          templatesToValidate,
          designTokensMap,
          platforms
        );

        console.log('✅ Pre-conformación completada:', preconformedResults);

        // Enriquecer output con metadatos de validación
        const enrichedOutput = {
          ...output,
          validationMetadata: {
            colorAnalysis,
            recommendations,
            preconformedResults,
            validatedAt: new Date().toISOString()
          }
        };

        return enrichedOutput;
      }

      return output;
    } catch (validationError: any) {
      console.error('❌ Error en validación de APIs:', validationError);
      console.log('⚠️ Continuando con templates sin pre-conformación...');
      
      // Devolver output original aunque falle la validación
      return {
        ...output,
        validationMetadata: {
          error: validationError.message,
          fallbackMode: true,
          validatedAt: new Date().toISOString()
        }
      };
    }
  }
);
