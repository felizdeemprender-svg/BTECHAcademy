'use server';
/**
 * @fileOverview Flujo de Genkit para generar el contenido FINAL de UN correo de
 * marketing a partir de un borrador y el curso real (generación individual on-demand).
 */

import { ai, validateApiKey } from '../genkit';
import { z } from 'genkit';

const EmailContentSchema = z.object({
  marketingName: z.string().describe('Nombre interno/comercial del correo (corto y persuasivo).'),
  subject: z.string().describe('Asunto final del correo: máx 60 caracteres, con beneficio claro.'),
  preheader: z.string().describe('Línea de texto oculta que acompaña al asunto en la bandeja de entrada.'),
  body: z.string().describe('Cuerpo COMPLETO del correo redactado, en texto plano con párrafos separados por saltos de línea.'),
});

export type EmailContentOutput = z.infer<typeof EmailContentSchema>;

export interface GenerateEmailContentInput {
  variant: any;
  directives: string;
  courseTitle?: string;
  courseDescription?: string;
  targetAudience?: string;
  mentorName?: string;
  mentorBio?: string;
  mentorSocials?: Record<string, string>;
  mission?: 'venta' | 'autoridad' | 'lanzamiento' | 'leads';
}

const missionTones: Record<string, string> = {
  venta: "Tono altamente persuasivo, enfocado en RESULTADOS, ROI y ESCASEZ. El CTA debe ser un cierre de venta directo.",
  autoridad: "Tono sofisticado, enfocado en CREDIBILIDAD, EXPERIENCIA y VALOR. El CTA debe invitar a aprender más o confiar en el mentor.",
  lanzamiento: "Tono vibrante, enfocado en ANTICIPACIÓN y EXCLUSIVIDAD. El CTA debe ser un registro para un evento o aprovechamiento de bono.",
  leads: "Tono directo y servicial, enfocado en la solución de un PROBLEMA específico mediante el curso. El CTA debe ser la descarga o acceso inicial."
};

const emailTypeInstructions: Record<string, string> = {
  direct: "EMAIL DIRECTO: Ve al grano. Estructura: gancho inicial → problema → solución (curso) → oferta → CTA. Un solo dolor, una promesa clara.",
  storytelling: "EMAIL DE HISTORIA: Narra una historia corta del mentor o de un alumno que conecte emocionalmente y termine llevando al curso. Estructura: apertura narrativa → nudo con tensión → desenlace/transformación → CTA.",
  benefits: "EMAIL DE BENEFICIOS: Enfocado en la transformación que logra el alumno. Estructura: promesa → beneficios concretos del curso → prueba/credibilidad → CTA."
};

export async function generateEmailContent(input: GenerateEmailContentInput): Promise<EmailContentOutput> {
  const {
    variant,
    directives,
    courseTitle,
    courseDescription,
    targetAudience,
    mentorName,
    mentorBio,
    mentorSocials,
    mission = 'venta',
  } = input;

  console.log(`[AI:Flow] Generando correo individual: ${variant?.marketingName} | Tipo: ${variant?.type || 'direct'}`);

  validateApiKey();

  const typeInstruction = emailTypeInstructions[variant?.type] || emailTypeInstructions.direct;

  const { output } = await ai.generate({
    prompt: `Actúa como un Copywriter Senior de Email Marketing de Respuesta Directa especializado en infoproductos.
Tu tarea es redactar el contenido FINAL de UN correo de marketing para el curso de un mentor.

=== MISIÓN ESTRATÉGICA ===
${missionTones[mission]}

=== REGLA DE ORO: EL CURSO ES EL REY ===
El curso trata sobre "${courseTitle}". Descripción: "${courseDescription}".
Si las directivas o el público objetivo mencionan otra industria, IGNÓRALA y usa solo su tono/estructura, aplicándolo 100% a la realidad del curso.
Dirígete a: ${targetAudience || 'General'}.

=== DATOS DEL MENTOR ===
Nombre: ${mentorName || 'Mentor Experto'}
Bio: ${mentorBio || 'No provista'}
Redes sociales: ${mentorSocials ? JSON.stringify(mentorSocials) : 'No provistas'}
Reflejá el estilo de comunicación y el tono del mentor en el correo.

=== TIPO DE CORREO (ESTRUCTURA OBLIGATORIA) ===
${typeInstruction}

=== DIRECTIVAS ESTRATÉGICAS ===
"${directives}"

=== CONTEXTO DEL BORRADOR ===
Nombre de la pieza: ${variant?.marketingName || 'Email de campaña'}

REGLAS FINALES:
- Idioma: Español rioplatense cálido, profesional y persuasivo. Sin relleno genérico.
- Asunto: máx 60 caracteres, con beneficio claro y (si la misión lo pide) urgencia.
- Preheader: una frase corta que complemente el asunto.
- Cuerpo: 3 a 6 párrafos, orientado a acción, con UN solo CTA claro al final.
- No inventar datos falsos.`,
    output: { schema: EmailContentSchema },
    config: { temperature: 0.7 }
  });

  if (!output) {
    throw new Error('La IA no devolvió un correo válido.');
  }

  return output;
}
