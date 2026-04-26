'use server';

import { ai, validateApiKey } from '../genkit';
import { z } from 'genkit';

const TutorWebsiteConfigSchema = z.object({
  headline: z.string().describe('Titular de impacto profesional (5-8 palabras). Enfocado en el beneficio del alumno.'),
  subheadline: z.string().describe('Propuesta de valor detallada (15-20 palabras).'),
  mission: z.string().describe('Frase corta de misión o propósito.'),
  pilares: z.array(z.object({
    titulo: z.string().describe('Título del pilar metodológico.'),
    descripcion: z.string().describe('Breve explicación de cómo este pilar ayuda al alumno.')
  })).length(3),
  badges: z.array(z.object({
    label: z.string().describe('Título corto de la medalla (ej: "Soporte VIP")'),
    description: z.string().describe('Frase de respaldo que justifica este valor (ej: "Acompañamiento en cada paso para asegurar resultados").')
  })).length(3),
  showStats: z.boolean().describe('Sugerencia de si mostrar estadísticas de números o no.'),
  suggested_theme: z.enum(['modern-dark', 'professional-light', 'nature-green', 'tech-blue']).describe('El estilo visual que mejor encaja con el perfil.')
});

export async function generateTutorProfile(
  name: string,
  bio: string,
  socials: any
): Promise<any> {
  validateApiKey();

  const { output: parsed } = await ai.generate({
    prompt: `Actúa como un Experto en Brand Storytelling y Marketing de Autoridad para Mentores.
Tu misión es transformar una biografía de tutor en una "Web de Marca Personal Premium".

DATOS DEL TUTOR:
- Nombre: ${name}
- Biografía actual: ${bio}
- Redes/Web: ${JSON.stringify(socials)}

INSTRUCCIONES ESTRATÉGICAS:
1. DECONSTRUCCIÓN: Analiza la biografía para extraer los valores fundamentales, la trayectoria y el nicho.
2. NARRATIVA DE TRANSFORMACIÓN: El titular no debe ser descriptivo ("Soy ingeniero"), debe ser aspiracional ("Escala tu negocio con rigor técnico").
3. AUTORIDAD SIN NÚMEROS: Si no detectas hitos de miles de alumnos, enfócate en la CALIDAD: "Mentoría de Proximidad", "Acompañamiento VIP", "Metodología Basada en Casos Reales".
4. TRES PILARES: Divide su metodología en 3 bloques claros y diferenciados.
5. TONO: Mantén un tono profesional, sofisticado pero cercano.

Genera una estructura web impecable basada en estos datos.`,
    output: { schema: TutorWebsiteConfigSchema },
    config: { temperature: 0.7 }
  });

  return parsed;
}
