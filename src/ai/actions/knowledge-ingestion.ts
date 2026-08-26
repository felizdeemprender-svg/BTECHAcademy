'use server';

import { adminDb } from '@/firebase/admin';
import { ai } from '@/ai/genkit';
import { cookies } from 'next/headers';

export async function ingestFaqsFromText(rawText: string) {
  try {
    const cookieStore = await cookies();
    const uid = cookieStore.get('btech_uid')?.value;
    const role = cookieStore.get('btech_role')?.value;

    if (!uid || role !== 'mentor') {
      return { success: false, error: 'No autorizado' };
    }

    // Un parser muy sencillo: asume formato "Q: Pregunta \n A: Respuesta" 
    // o "Pregunta: ... \n Respuesta: ..."
    const pairs = rawText.split(/(?:Q:|Pregunta:)/i).filter(t => t.trim().length > 0);
    
    let ingestedCount = 0;

    for (const block of pairs) {
      const parts = block.split(/(?:A:|Respuesta:)/i);
      if (parts.length === 2) {
        const question = parts[0].trim();
        const answer = parts[1].trim();

        if (question && answer) {
          const embedResult = await ai.embed({
            embedder: 'googleai/text-embedding-004',
            content: question + "\n" + answer
          });
          const embeddingVector = embedResult[0].embedding;

          await adminDb.collection('knowledgeBase').add({
            mentorId: uid,
            question,
            answer,
            embedding: embeddingVector,
            createdAt: new Date().toISOString()
          });
          ingestedCount++;
        }
      }
    }

    return { success: true, ingestedCount };
  } catch (error: any) {
    console.error('[Ingest Error]', error);
    return { success: false, error: error.message };
  }
}
