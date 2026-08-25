'use server';
/**
 * @fileOverview Asistente independiente Evo para guiar al usuario dentro de la plataforma.
 */

import { ai, generateWithAuditing } from '@/ai/genkit';
import { z } from 'genkit';
import { readDocumentationTool, getStudentsProgressTool, getMentorAgendaTool } from './evo-context';
import { universalFirestoreQueryTool } from './evo-universal-query';
import { searchKnowledgeBaseTool } from './evo-knowledge';
import { enrollStudentTool, formatCrmNotesTool } from './evo-agent-tools';

const EvoAssistantInputSchema = z.object({
  message: z.string().describe('Pregunta o solicitud del usuario.'),
  role: z.enum(['alumno', 'mentor', 'admin', 'marketing']).default('alumno'),
  currentPath: z.string().default('/dashboard'),
  userDisplayName: z.string().optional().describe('Nombre visible del usuario.'),
  userEmail: z.string().optional().describe('Correo del usuario.'),
  permissions: z.array(z.string()).optional().describe('Lista de permisos o capacidades relevantes del usuario.'),
  userObjects: z.string().optional().describe('Resumen de objetos del usuario (cursos, progreso, pendientes) para dar respuestas contextuales.'),
});

export type EvoAssistantInput = z.infer<typeof EvoAssistantInputSchema>;

const EvoAssistantOutputSchema = z.object({
  response: z.string().describe('Respuesta directa y útil de Evo.'),
  nextSteps: z.array(z.string()).describe('Pasos recomendados para continuar.'),
  guardrails: z.array(z.string()).describe('Recordatorios de seguridad y límites del asistente.'),
});

export type EvoAssistantOutput = z.infer<typeof EvoAssistantOutputSchema>;

const prompt = ai.definePrompt({
  name: 'evoAssistantPrompt',
  input: { schema: EvoAssistantInputSchema },
  output: { schema: EvoAssistantOutputSchema },
  tools: [readDocumentationTool, getStudentsProgressTool, enrollStudentTool, formatCrmNotesTool, getMentorAgendaTool, universalFirestoreQueryTool, searchKnowledgeBaseTool],
  prompt: `Eres Evo, un agente proactivo de la plataforma FastoriaAcademy.
Tu misión principal depende del rol del usuario con el que hables.

Contexto del usuario:
- Fecha actual: ${new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
- Rol actual: {{{role}}}
- Ruta actual: {{{currentPath}}}
- Nombre: {{#if userDisplayName}}{{{userDisplayName}}}{{else}}Usuario{{/if}}
- Correo: {{#if userEmail}}{{{userEmail}}}{{else}}No disponible{{/if}}
- Permisos relevantes: {{#if permissions}}{{{permissions}}}{{else}}Sin permisos especiales{{/if}}

INSTRUCCIONES ESPECÍFICAS SEGÚN ROL:
Si el "Rol actual" es "mentor":
1. Eres un **Analista de Datos e Instructor**. Tienes acceso omnisciente a los datos usando \`universalFirestoreQueryTool\`.
   DICCIONARIO DE DATOS PARA TUS CONSULTAS:
   - Colecciones principales: \`courses\`, \`enrollments\` (progreso), \`salesPages\` (landings), \`leads\` (CRM), \`followups\`, \`campaigns\`, \`users\`.
   - Subcolecciones (usa isCollectionGroup=true): \`individualTasks\` (desafíos libres).
   - Matemáticas: Usa "count" para contar, "sum" / "average" sobre campos numéricos (ej: views, progressPercent).
2. Usa \`searchKnowledgeBaseTool\` SIEMPRE que el mentor te pregunte cómo funciona algo en la plataforma, reglas de negocio (reembolsos, certificados) o soporte operativo.
3. Usa \`getStudentsProgressTool\` para reportes de progreso detallados por módulo de cada alumno.
4. Usa \`getMentorAgendaTool\` de forma EXCLUSIVA y OBLIGATORIA para CUALQUIER pregunta sobre seguimientos, sesiones, fechas de sesiones, alumnos involucrados en seguimientos o cálculo de horas. (La herramienta ya te devuelve el nombre del alumno en cada sesión).
5. Tienes autorización para ejecutar acciones (matricular alumnos o guardar notas CRM) SOLAMENTE si el mentor te lo pide con instrucciones muy específicas.

Si el "Rol actual" es "admin":
1. Eres el **Instructor y Supervisor de Fastoria**. Guía al admin a través del panel usando las herramientas.

Para cualquier otro rol (ej. "alumno"):
1. Tu misión es guiar, explicar y sugerir próximos pasos de forma segura. No modifiques datos de alumnos.

Pregunta o Historial del usuario:
{{{message}}}

Conocimiento de la Plataforma (Búsqueda de Manuales):
Si preguntan algo estructural o interno, usa \`readDocumentationTool\`.
- Para saber CÓMO usar la plataforma (crear cursos, alumnos, landings, etc), lee el archivo \`tutor_manual.md\`.

Reglas universales:
- CRÍTICO: Tu respuesta FINAL siempre debe coincidir con el esquema JSON esperado (respuesta, próximos pasos, guardrails). NO respondas con texto plano fuera del JSON.
- Si no sabes cómo proceder, ofrece dos opciones lógicas sobre cómo podrías ayudar.
- Responde siempre de forma clara, accionable y resumida (no satures al usuario).
- Incluye una respuesta, hasta 3 próximos pasos y 2 límites si corresponde.`,
});

export async function askEvo(input: EvoAssistantInput): Promise<EvoAssistantOutput> {
  const renderedOptions = await prompt.render(input);
  
  const response = await generateWithAuditing(renderedOptions, 'evo_assistant');

  if (!response.output) {
    throw new Error('No se pudo generar una respuesta de Evo.');
  }

  return response.output;
}
