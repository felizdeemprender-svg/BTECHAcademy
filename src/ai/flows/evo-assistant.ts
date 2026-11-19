'use server';
/**
 * @fileOverview Asistente independiente Evo para guiar al usuario dentro de la plataforma.
 */

import { ai, generateWithAuditing } from '@/ai/genkit';
import { z } from 'genkit';
import { 
  readDocumentationTool, 
  getStudentsProgressTool, 
  getMentorAgendaTool,
  getMentorDataTool,
  getStudentDataTool 
} from './evo-context';
import { universalFirestoreQueryTool } from './evo-universal-query';
import { searchKnowledgeBaseTool } from './evo-knowledge';
import { enrollStudentTool, formatCrmNotesTool } from './evo-agent-tools';

const EvoAssistantInputSchema = z.object({
  message: z.string().describe('Pregunta o solicitud del usuario.'),
  role: z.enum(['alumno', 'mentor', 'admin', 'marketing']).default('alumno'),
  currentPath: z.string().default('/dashboard'),
  uid: z.string().optional().describe('ID único del usuario actual (UID de Firebase).'),
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
  tools: [
    getMentorDataTool,
    getStudentDataTool,
    readDocumentationTool,
    getStudentsProgressTool,
    enrollStudentTool,
    formatCrmNotesTool,
    getMentorAgendaTool,
    universalFirestoreQueryTool,
    searchKnowledgeBaseTool
  ],
  prompt: `Eres Evo, un agente proactivo de la plataforma FastoriaAcademy.
Tu misión principal depende del rol del usuario con el que hables.

Contexto del usuario:
- Fecha actual: ${new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
- Rol actual: {{{role}}}
- UID del usuario: {{#if uid}}{{{uid}}}{{else}}No disponible{{/if}}
- Ruta actual: {{{currentPath}}}
- Nombre: {{#if userDisplayName}}{{{userDisplayName}}}{{else}}Usuario{{/if}}
- Correo: {{#if userEmail}}{{{userEmail}}}{{else}}No disponible{{/if}}
- Permisos relevantes: {{#if permissions}}{{{permissions}}}{{else}}Sin permisos especiales{{/if}}

INSTRUCCIONES ESPECÍFICAS SEGÚN ROL:
Si el "Rol actual" es "mentor" o "admin":
1. Eres un **Analista de Datos e Instructor**.
2. **IDENTIDAD Y ACCESO GARANTIZADO:**
   - Tu usuario autenticado tiene UID de mentor: \`{{{uid}}}\`.
   - SIEMPRE tienes acceso a su ID y a su base de datos.
   - NUNCA digas que no tienes acceso al ID de mentor o que no puedes consultar su información.
3. **REGLA OBLIGATORIA PARA CURSOS Y ALUMNOS (MÉTRICAS Y CONTEOS):**
   - Si el usuario pregunta cuántos cursos tiene, cuántos alumnos tiene en total, o **cuántos alumnos sin repetir / únicos tiene por cada curso**: DEBES LLAMAR INMEDIATAMENTE a la herramienta \`getMentorData\`.
   - Puedes invocarla como \`getMentorData({ mentorId: "{{{uid}}}" })\` o simplemente \`getMentorData({})\`.
   - \`getMentorData\` ya calcula automáticamente todos los cursos del mentor, los alumnos únicos por cada curso (\`uniqueStudentsCount\` / \`studentsCount\`) y el total general de alumnos únicos sin duplicados (\`totalUniqueStudentsAcrossAllCourses\`).
   - NUNCA uses \`searchKnowledgeBase\` para preguntas numéricas, estadísticas o de conteo de alumnos.
   - Usa los datos devueltos por \`getMentorData\` para responder con la lista detallada de cada curso, indicando su nombre y la cantidad exacta de alumnos únicos inscritos, más el total global.
4. Tienes acceso a \`universalFirestoreQueryTool\` para búsquedas y operaciones sobre \`salesPages\` (landings), \`leads\` (CRM), \`followups\`, \`campaigns\`, etc.
5. Usa \`searchKnowledgeBaseTool\` ÚNICAMENTE cuando el mentor te pregunte por políticas teóricas, reglas de negocio generales (ej: reembolsos, emisión de certificados) o manuales.
6. **CONSULTAS DE AVANCE, PROGRESO O LISTADO DE ALUMNOS (REGLA ESTRICTA):**
   - Si el mentor pregunta por el progreso o avance de sus alumnos, quiénes tienen más del 0%, quiénes están retrasados, o solicita el listado de inscriptos de un curso (ej: "LANZAR", "ESCALAR"): DEBES INVOCAR INMEDIATAMENTE \`getStudentsProgress\`.
   - Si el mentor menciona el nombre de un curso, pasa \`courseName: "<nombre>"\` a \`getStudentsProgress\` (ej: \`courseName: "LANZAR"\` o \`courseName: "ESCALAR"\`).
   - \`getStudentsProgress\` devuelve el nombre real del alumno (\`studentName\`), su correo (\`studentEmail\`), su curso y su porcentaje exacto de avance (\`progressPercent\`).
   - Muestra siempre el desglose con los nombres reales de los alumnos y su % de avance.
   - Las cuentas de prueba del tutor (como \`tutor.felizdeemprender\`) tienen \`isTutorTest: true\`. Acláralo como usuario de prueba interno del tutor y enfócate en los alumnos reales inscritos.
7. Usa \`getMentorAgendaTool\` de forma EXCLUSIVA y OBLIGATORIA para CUALQUIER pregunta sobre seguimientos, sesiones, fechas de sesiones, alumnos involucrados en seguimientos o cálculo de horas.
8. Tienes autorización para ejecutar acciones (matricular alumnos o guardar notas CRM) SOLAMENTE si el mentor te lo pide con instrucciones muy específicas.

Si el "Rol actual" es "admin":
1. Eres el **Instructor y Supervisor de Fastoria**. Guía al admin a través del panel usando las herramientas.

Para cualquier otro rol (ej. "alumno"):
1. Tu misión es guiar, explicar y sugerir próximos pasos de forma segura. Si el alumno pregunta por sus cursos o progreso, usa \`getStudentData\`. No modifiques datos de alumnos.

Pregunta o Historial del usuario:
{{{message}}}

Conocimiento de la Plataforma (Búsqueda de Manuales):
Si preguntan algo estructural o interno, usa \`readDocumentationTool\`.
- Para saber CÓMO usar la plataforma (crear cursos, alumnos, landings, etc), lee el archivo \`tutor_manual.md\`.

Reglas universales:
- CRÍTICO Y OBLIGATORIO: Tras invocar cualquier herramienta (como \`getMentorData\`), NUNCA debes terminar tu respuesta en silencio ni sin emitir texto. SIEMPRE debes tomar los datos devueltos por la herramienta y redactar tu mensaje final para el usuario.
- CRÍTICO: Tu respuesta FINAL siempre debe ser un objeto JSON válido con la siguiente estructura:
{
  "response": "tu mensaje o respuesta aquí",
  "nextSteps": ["paso 1", "paso 2"],
  "guardrails": ["recordatorio de límite o seguridad si corresponde"]
}
- Si no requieres pasos o guardrails, envía arreglos vacíos [].
- Si no sabes cómo proceder, ofrece dos opciones lógicas sobre cómo podrías ayudar.
- Responde siempre de forma clara, accionable y resumida (no satures al usuario).
- Incluye una respuesta, hasta 3 próximos pasos y 2 límites si corresponde.`,
});

export async function askEvo(input: EvoAssistantInput): Promise<EvoAssistantOutput> {
  const renderedOptions = await prompt.render(input);
  
  // Inyectar el contexto de identidad { uid, role } para las herramientas de Genkit (ai.currentContext()) y auditoría
  renderedOptions.context = {
    ...(renderedOptions.context || {}),
    uid: input.uid,
    role: input.role,
  };
  (renderedOptions as any).maxTurns = 5;

  const response = await generateWithAuditing(renderedOptions, 'evo_assistant');

  // 1. Extracción en cascada de texto desde múltiples canales
  let rawText = response.text || '';

  // 1b. Si text está vacío, revisar reasoning / thoughts (Gemini 2.5)
  if (!rawText.trim() && (response as any).reasoning) {
    rawText = (response as any).reasoning;
  }

  // 1c. Si response.output fue parseado como objeto estructurado por Genkit
  if (!rawText.trim() && (response as any).output) {
    const out = (response as any).output;
    if (typeof out === 'string') {
      rawText = out;
    } else if (out && typeof out === 'object') {
      if (typeof out.response === 'string') {
        return {
          response: out.response,
          nextSteps: Array.isArray(out.nextSteps) ? out.nextSteps : [],
          guardrails: Array.isArray(out.guardrails) ? out.guardrails : []
        };
      }
      rawText = JSON.stringify(out);
    }
  }

  // 1d. Inspeccionar partes de response.message.content
  if (!rawText.trim() && response.message?.content) {
    const parts = response.message.content;
    const extracted: string[] = [];
    for (const part of parts) {
      if (part.text && part.text.trim()) {
        extracted.push(part.text);
      } else if ((part as any).reasoning && (part as any).reasoning.trim()) {
        extracted.push((part as any).reasoning);
      } else if (part.data) {
        extracted.push(typeof part.data === 'string' ? part.data : JSON.stringify(part.data));
      }
    }
    rawText = extracted.join('\n').trim();
  }

  // 1e. Inspeccionar candidates
  if (!rawText.trim() && (response as any).candidates?.[0]?.message?.content) {
    const parts = (response as any).candidates[0].message.content;
    const extracted: string[] = [];
    for (const part of parts) {
      if (part.text && part.text.trim()) extracted.push(part.text);
      else if (part.reasoning && part.reasoning.trim()) extracted.push(part.reasoning);
    }
    rawText = extracted.join('\n').trim();
  }

  // 2. Si el texto sigue vacío pero se ejecutaron herramientas en los turnos previos, sintetizar respuesta directamente
  if (!rawText.trim()) {
    const messages = (response as any).messages || [];
    const toolMsg = messages.slice().reverse().find((m: any) => m.role === 'tool');

    if (toolMsg && toolMsg.content) {
      const toolParts = Array.isArray(toolMsg.content) ? toolMsg.content : [toolMsg.content];
      for (const p of toolParts) {
        const output = p.toolResponse?.output || p.output;
        if (output) {
          if (output.courses && Array.isArray(output.courses)) {
            const courseLines = output.courses.map((c: any) => 
              `- **${c.title}**: ${c.uniqueStudentsCount ?? c.studentsCount ?? 0} alumnos sin repetir (Estado: ${c.status || 'activo'})`
            ).join('\n');
            const total = output.totalUniqueStudentsAcrossAllCourses ?? output.totalUniqueStudents ?? 0;
            return {
              response: `Aquí tienes el desglose de tus alumnos únicos por curso:\n\n${courseLines}\n\n**Total general de alumnos únicos (sin duplicados):** ${total}`,
              nextSteps: ['Ver detalles de un curso', 'Consultar seguimiento de alumnos'],
              guardrails: ['Los conteos consideran alumnos únicos inscritos sin duplicados.']
            };
          } else if (output.students && Array.isArray(output.students)) {
            const studentLines = output.students.map((s: any) => 
              `- **${s.studentName}** (${s.studentEmail}): **${s.progressPercent}%** de avance en *${s.courseTitle}* ${s.isTutorTest ? '*(Cuenta de prueba del tutor)*' : ''}`
            ).join('\n');
            const total = output.totalMatching ?? output.returnedCount ?? output.students.length;
            return {
              response: `Aquí tienes el listado y porcentaje de avance de tus alumnos (${output.filteredByCourse}):\n\n${studentLines}\n\n**Total listados:** ${total} alumnos.`,
              nextSteps: ['Filtrar alumnos con más del 0%', 'Ver agenda de tutorías'],
              guardrails: ['Los porcentajes reflejan el avance real registrado en la plataforma.']
            };
          } else if (typeof output === 'string') {
            rawText = output;
            break;
          } else if (typeof output === 'object') {
            if (output.message && typeof output.message === 'string') {
              rawText = output.message;
            } else {
              rawText = JSON.stringify(output);
            }
            break;
          }
        }
      }
    }
  }

  // 3. Fallback de contingencia conversacional si no se pudo extraer texto (evita error 500)
  if (!rawText.trim()) {
    console.warn('[Evo Warning] Respuesta vacía de modelo. Devolviendo mensaje de contingencia.');
    return {
      response: 'He recibido tu solicitud, pero no pude generar un resumen detallado en este momento. Por favor, realiza nuevamente tu consulta o especifica el nombre del curso o alumno que deseas consultar.',
      nextSteps: ['Consultar mis cursos', 'Consultar alumnos', 'Ver agenda'],
      guardrails: []
    };
  }

  try {
    const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, rawText];
    const candidate = jsonMatch[1] ? jsonMatch[1].trim() : rawText.trim();
    const parsed = JSON.parse(candidate);
    const validated = EvoAssistantOutputSchema.safeParse(parsed);
    if (validated.success) {
      return validated.data;
    }
  } catch {
    // Si la respuesta no es un JSON estricto, envolver el texto plano limpiamente
  }

  return {
    response: rawText.replace(/```(?:json)?/g, '').replace(/```/g, '').trim(),
    nextSteps: [],
    guardrails: []
  };
}
