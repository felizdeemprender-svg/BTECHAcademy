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
  socials: any,
  isEnterprise: boolean = false,
): Promise<any> {
  validateApiKey();

  const prompt = isEnterprise
    ? `Actúa como un Consultor Senior en Posicionamiento Institucional y Marketing Educativo Corporativo para Academias y Empresas de Formación Multi-Tenant.
Tu misión es transformar la visión y trayectoria de una empresa/organización educativa en un "Portal Web Institucional de Alta Autoridad y Prestigio".

DATOS DE LA ORGANIZACIÓN / EMPRESA:
- Nombre Institucional: ${name}
- Misión / Presentación actual: ${bio}
- Enlaces Oficiales: ${JSON.stringify(socials)}

INSTRUCCIONES ESTRATÉGICAS INSTITUCIONALES:
1. IDENTIDAD CORPORATIVA: El titular y subtítulo deben comunicar solvencia, estándar pedagógico de excelencia y capacidad formativa (ej: "Centro de Formación y Liderazgo Profesional", "Programas de Alta Especialización Avalados por Expertos").
2. PROPUESTA DE VALOR: Destacar el impacto en los alumnos, metodología práctica y el respaldo institucional de la organización.
3. TRES PILARES INSTITUCIONALES: Define 3 pilares clave de la academia (ej: "Metodología Práctica y Aplicada", "Acompañamiento y Mentoría Personalizada", "Certificación Oficial Verificable").
4. ACREDITACIONES Y SELLOS DE CALIDAD: Diseña 3 sellos de calidad y confianza institucional (ej: "Acreditación Continua", "Gobernanza Pedagógica", "Soporte y Seguimiento Activo").
5. CLAUSTRO DE TUTORES: IMPORTANTE: NO inventes nombres ni información de tutores específicos; el claustro docente es dinámico y se administra independientemente por la empresa.
6. TONO: Estrictamente profesional, institucional, riguroso, corporativo y aspiracional. Cero emojis.

Genera una estructura web institucional impecable basada en estos datos.`
    : `Actúa como un Experto en Brand Storytelling y Marketing de Autoridad para Mentores.
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
5. TONO: Mantén un tono profesional, sofisticado pero cercano. Cero emojis.

Genera una estructura web impecable basada en estos datos.`;

  const { output: parsed } = await ai.generate({
    prompt,
    output: { schema: TutorWebsiteConfigSchema },
    config: { temperature: 0.7 }
  });

  return parsed;
}
