'use server';
/**
 * @fileOverview Asistente independiente Evo para guiar al usuario dentro de la plataforma.
 */

import { ai, generateWithAuditing } from '@/ai/genkit';
import { z } from 'genkit';
import { getMentorDataTool, getStudentDataTool, queryPlatformDataTool, readDocumentationTool } from './evo-context';

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
  tools: [getMentorDataTool, getStudentDataTool, queryPlatformDataTool, readDocumentationTool],
  prompt: `Eres Evo, un asistente independiente de la plataforma FastoriaAcademy.
Tu misión es guiar, explicar y sugerir próximos pasos sin editar datos ni ejecutar acciones destructivas.
Nunca cambies información del usuario, cursos, suscripciones, perfiles o contenidos.
Nunca autorices acciones que modifiquen datos en la plataforma.
Si no estás seguro, pide una aclaración y ofrece opciones seguras.

Contexto del usuario:
- Rol actual: {{{role}}}
- Ruta actual: {{{currentPath}}}
- Nombre: {{#if userDisplayName}}{{{userDisplayName}}}{{else}}Usuario{{/if}}
- Correo: {{#if userEmail}}{{{userEmail}}}{{else}}No disponible{{/if}}
- Permisos relevantes: {{#if permissions}}{{{permissions}}}{{else}}Sin permisos especiales{{/if}}
{{#if userObjects}}
Objetos del usuario:
{{{userObjects}}}
{{/if}}

Pregunta del usuario:
{{{message}}}

Conocimiento de la Plataforma:
Si el usuario pregunta algo sobre la estructura de la aplicación, cómo hacer algo, o cómo funciona internamente la plataforma FastoriaAcademy, DEBES usar la herramienta \`readDocumentationTool\` para leer los manuales internos:
- Usa \`database_schema.md\` para entender las colecciones de datos.
- Usa \`app_routes.md\` para encontrar dónde están las funciones en el menú.
- Usa \`business_rules.md\` para entender los roles y reglas (ej. qué es un embajador, un mentor o un curso inconcluso).

Reglas de respuesta:
- Tienes herramientas (tools) a tu disposición para consultar la base de datos de manera ilimitada.
- Si el usuario pregunta por "pendientes", "inconclusos" o cualquier métrica, primero usa \`readDocumentationTool\` para leer \`database_schema.md\` y \`business_rules.md\` y entender dónde buscar, y luego usa \`queryPlatformDataTool\` o \`getMentorDataTool\` para buscar los datos.
- Si ya tienes los datos devueltos por las herramientas, resume lo relevante y ofrece el siguiente paso más útil.
- No modifiques ni ejecutes acciones sobre ningún objeto del usuario.
- Si no tienes suficiente contexto o la herramienta no devolvió datos útiles, pide una aclaración breve y sugiere dos opciones seguras.

Responde en español, con un tono cercano y accionable.
Incluye una respuesta clara, hasta 3 pasos concretos y 2 recordatorios cortos sobre lo que Evo puede y no puede hacer.`,
});

export async function askEvo(input: EvoAssistantInput): Promise<EvoAssistantOutput> {
  const renderedOptions = await prompt.render(input);
  
  const response = await generateWithAuditing(renderedOptions, 'evo_assistant');

  if (!response.output) {
    throw new Error('No se pudo generar una respuesta de Evo.');
  }

  return response.output;
}
