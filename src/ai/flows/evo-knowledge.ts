import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { adminDb } from '@/firebase/admin';

function cosineSimilarity(A: number[], B: number[]) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < A.length; i++) {
    dotProduct += A[i] * B[i];
    normA += A[i] * A[i];
    normB += B[i] * B[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export const searchKnowledgeBaseTool = ai.defineTool(
  {
    name: 'searchKnowledgeBase',
    description: 'Buscador semántico en la base de conocimientos. Úsalo SIEMPRE que un usuario te haga una pregunta operativa, teórica, técnica o sobre reglas de negocio (ej: cómo funciona la plataforma, reembolsos, manuales).',
    inputSchema: z.object({
      query: z.string().describe('La pregunta o duda exacta del usuario (máximo 100 caracteres).'),
    }),
    outputSchema: z.any(),
  },
  async ({ query }) => {
    const context = ai.currentContext();
    const uid = context?.uid;
    if (!uid) throw new Error('No autorizado');

    try {
      console.log(`[RAG] Generando embedding para: "${query}"`);
      
      const embedResult = await ai.embed({
        embedder: 'googleai/text-embedding-004',
        content: query,
      });
      const queryVector = embedResult[0].embedding;

      const snapshot = await adminDb.collection('knowledgeBase').where('mentorId', '==', uid).get();
      
      if (snapshot.empty) {
        return { message: 'No hay documentos en tu base de conocimiento.' };
      }

      const results: any[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.embedding && Array.isArray(data.embedding)) {
          const similarity = cosineSimilarity(queryVector, data.embedding);
          results.push({
            id: doc.id,
            question: data.question,
            answer: data.answer,
            score: similarity
          });
        }
      });

      results.sort((a, b) => b.score - a.score);
      const topMatches = results.filter(r => r.score > 0.65).slice(0, 3); // 0.65 threshold

      if (topMatches.length === 0) {
        return { message: 'No encontré respuestas relevantes en la base de conocimiento para esa pregunta.' };
      }

      return {
        success: true,
        matches: topMatches.map(m => ({ pregunta_relacionada: m.question, respuesta_oficial: m.answer }))
      };
    } catch (error: any) {
      console.error('[RAG Error]', error);
      return { success: false, error: 'Fallo al consultar la base de conocimiento.' };
    }
  }
);
