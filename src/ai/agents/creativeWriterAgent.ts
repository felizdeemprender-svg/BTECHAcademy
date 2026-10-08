import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SceneContentSchema = z.object({
  segment_label: z.string().describe('Ej: GANCHO, VALOR, CTA.'),
  text: z.string().describe('Texto visual ultra-corto (2-4 palabras).'),
  subtitle: z.string().describe('Texto secundario o de apoyo (6-8 palabras).'),
  voiceover: z.string().describe('Guion narrativo. CRÍTICO: Debe durar aprox 10-15s hablado.'),
  media_hint: z.string().describe('Keywords para buscar fondo visual (ej: "minimalist luxury office").'),
  duration: z.number().describe('Duración en segundos (ej: 10).'),
});

const CreativeWriterInput = z.object({
  campaignTitle: z.string(),
  productName: z.string(),
  productDescription: z.string().optional(),
  targetAudience: z.string().optional(),
  funnelPhase: z.string(), // ej. "Expectativa", "Venta", "Cierre"
  platform: z.string(), // ej. "instagram", "tiktok", "linkedin"
  marketingImprint: z.string().optional(), // Impronta del equipo de marketing
  format: z.string().optional(), // ej. "story", "reel", "carousel"
});

export const CreativeWriterOutput = z.object({
  hook: z.string().describe('Copy inicial (ej: "El secreto para escalar...").'),
  caption: z.string().describe('Cuerpo del post para la red social.'),
  visualStyle: z.string().describe('Estilo visual (ej: "Cinematic, dark mode").'),
  scenes: z.array(SceneContentSchema).describe('Lista de escenas o slides del video/carrusel.'),
});

export const runCreativeWriter = ai.defineFlow(
  {
    name: 'runCreativeWriter',
    inputSchema: CreativeWriterInput,
    outputSchema: CreativeWriterOutput,
    description: 'Redacta el guion y copy de un video contextualizado a la fase del embudo y plataforma.',
  },
  async (input) => {
    const prompt = `
Actúa como un Copywriter y Director Creativo Senior. 
Se te ha asignado crear el guion y copy de un video (o carrusel) para la red social: ${input.platform.toUpperCase()}.

Contexto del Producto:
- Campaña: ${input.campaignTitle}
- Producto: ${input.productName}
- Descripción: ${input.productDescription || 'N/A'}
- Audiencia: ${input.targetAudience || 'General'}

Fase del Embudo para este video: ${input.funnelPhase.toUpperCase()}
Formato solicitado: ${input.format?.toUpperCase() || 'VIDEO CORTO'}
(Debes adaptar el tono y el CTA a esta fase y formato. Ej: si es Expectativa, genera intriga; si es Venta, da valor; si es Cierre, haz un CTA directo de compra).

Impronta del Equipo de Marketing (Directivas de Marca):
"${input.marketingImprint || 'Tono profesional, persuasivo, directo al grano y enfocado en resultados tangibles.'}"

Reglas Técnicas:
1. Todo el contenido debe estar en ESPAÑOL.
2. 'hook': Escribe un gancho corto y atrapante para el post.
3. 'caption': El texto completo que acompaña la publicación (incluye emojis).
4. 'scenes': Divide el video en 3 a 5 escenas (Ej: GANCHO, VALOR 1, VALOR 2, CTA). 
   - Para cada escena, el 'text' (pantalla) debe ser ultra-corto.
   - El 'voiceover' (locución) debe ser fluido.
   - El 'media_hint' describe qué se debe ver de fondo (sin género específico).
5. LÍMITE DE DURACIÓN (CRÍTICO): Si el formato solicitado es "story" o "historias", la suma total de los campos 'duration' de todas las escenas NO PUEDE exceder los 60 segundos bajo ningún concepto (ideal 45-50s).
6. Devuelve un JSON válido que cumpla con el esquema requerido.
`;

    const { output } = await ai.generate({
      prompt,
      output: { format: 'json', schema: CreativeWriterOutput },
    });

    if (!output) {
      throw new Error("No output from creative writer model");
    }

    return output;
  }
);
