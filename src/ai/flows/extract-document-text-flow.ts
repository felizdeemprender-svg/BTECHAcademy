'use server';
/**
 * @fileOverview Flujo de Genkit para la extracción de texto optimizada.
 * Soporta exclusivamente archivos de Word (.docx) y Texto (.txt).
 * El procesamiento se realiza priorizando la velocidad y omitiendo contenido no textual.
 * Ahora soporta URLs para evitar errores de CORS en el cliente.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ExtractDocumentTextInputSchema = z.object({
  documentDataUri: z.string().optional().describe("Data URI del documento (DOCX o Texto)."),
  documentUrl: z.string().optional().describe("URL del documento (opcional, si ya está en Storage)."),
  documentName: z.string().describe("Nombre original del archivo."),
});
export type ExtractDocumentTextInput = z.infer<typeof ExtractDocumentTextInputSchema>;

const ExtractDocumentTextOutputSchema = z.object({
  extractedText: z.string().optional(),
  error: z.string().optional(),
});
export type ExtractDocumentTextOutput = z.infer<typeof ExtractDocumentTextOutputSchema>;

export async function extractDocumentText(input: ExtractDocumentTextInput): Promise<ExtractDocumentTextOutput> {
  try {
    return await extractDocumentTextFlow(input);
  } catch (e: any) {
    console.error("[Flow Error: ExtractText]", e);
    return { error: e.message || "Error crítico en el motor de extracción." };
  }
}

const extractDocumentTextFlow = ai.defineFlow(
  {
    name: 'extractDocumentTextFlow',
    inputSchema: ExtractDocumentTextInputSchema,
    outputSchema: ExtractDocumentTextOutputSchema,
  },
  async (input) => {
    let currentDataUri = input.documentDataUri;

    // Si viene una URL, descargamos el archivo en el servidor para evitar bloqueos de CORS en el navegador
    if (input.documentUrl && !currentDataUri) {
      try {
        const response = await fetch(input.documentUrl);
        if (!response.ok) throw new Error(`Fallo al descargar desde Storage (Status: ${response.status})`);
        const contentType = response.headers.get('content-type') || 'application/octet-stream';
        const arrayBuffer = await response.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        currentDataUri = `data:${contentType};base64,${base64}`;
      } catch (e: any) {
        return { error: `Error de red institucional: ${e.message}` };
      }
    }

    if (!currentDataUri) {
      return { error: 'No se detectó contenido para procesar. Adjunta un archivo o proporciona una URL válida.' };
    }

    // 1. Manejo de Texto Plano (.txt)
    if (currentDataUri.includes('text/plain') || input.documentName.toLowerCase().endsWith('.txt')) {
      try {
        const base64Part = currentDataUri.split(',')[1];
        if (!base64Part) throw new Error("Archivo de texto vacío.");
        
        const fullText = Buffer.from(base64Part, 'base64').toString('utf-8');
        if (!fullText.trim()) throw new Error("El archivo no contiene texto legible.");

        // Para textos muy grandes, limpiamos con IA
        if (fullText.length > 15000) {
          const truncated = fullText.substring(0, 15000);
          const { text } = await ai.generate({
            prompt: `Limpia y extrae el texto educativo principal de este contenido, ignorando basura técnica:\n\n${truncated}`,
            config: { temperature: 0.1 }
          });
          return { extractedText: text || truncated };
        }
        
        return { extractedText: fullText.trim() };
      } catch (e: any) {
        return { error: `Fallo al leer texto plano: ${e.message}` };
      }
    }

    // 2. Manejo de Word (.docx)
    if (currentDataUri.includes('wordprocessingml.document') || input.documentName.toLowerCase().endsWith('.docx')) {
      try {
        const { text, finishReason } = await ai.generate({
          prompt: [
            { text: `Actúa como un transcriptor experto. Extrae EXCLUSIVAMENTE el texto educativo legible de este Word. Omite imágenes y logotipos.` },
            { media: { url: currentDataUri, contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' } },
          ],
          config: { temperature: 0.1 },
        });

        if (finishReason !== 'stop') return { error: `Procesamiento incompleto: ${finishReason}` };
        if (!text || text.trim().length < 10) return { error: 'No se detectó suficiente texto en el Word.' };

        return { extractedText: text.trim() };
      } catch (error: any) {
        return { error: `Gemini falló al procesar el Word: ${error.message}` };
      }
    }

    return { error: 'Formato no soportado. Usa Word (.docx) o Texto (.txt).' };
  }
);