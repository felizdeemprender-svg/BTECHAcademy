'use server';
/**
 * @fileOverview Flujo de Genkit para la extracción de texto optimizada.
 * Soporta exclusivamente archivos de Word (.docx) y Texto (.txt).
 * El procesamiento se realiza priorizando la velocidad y omitiendo contenido no textual.
 * Ahora soporta URLs para evitar errores de CORS en el cliente.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import mammoth from 'mammoth';

const ExtractDocumentTextInputSchema = z.object({
  documentDataUri: z.string().optional().describe("Data URI del documento (PDF, DOCX o Texto)."),
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
    if (
      currentDataUri.includes('wordprocessingml.document') || 
      currentDataUri.includes('application/msword') ||
      input.documentName.toLowerCase().endsWith('.docx') ||
      input.documentName.toLowerCase().endsWith('.doc')
    ) {
      try {
        const base64Part = currentDataUri.split(',')[1];
        if (!base64Part) throw new Error("Archivo de Word vacío.");
        const buffer = Buffer.from(base64Part, 'base64');

        // Extracción de texto usando mammoth (Compatible con Firebase)
        const result = await mammoth.extractRawText({ buffer });
        const fullText = result.value;
        
        if (!fullText || fullText.trim().length < 10) {
          throw new Error('No se pudo extraer suficiente texto del documento Word.');
        }

        // Enviamos el texto extraído a Gemini para limpieza y estructuración
        const { text } = await ai.generate({
          prompt: `Actúa como un transcriptor experto. Aquí tienes el contenido extraído de un documento Word. Limpia el texto, mantén la jerarquía educativa y omite cualquier ruido o metadatos:\n\n${fullText.substring(0, 50000)}`,
          config: { temperature: 0.1 },
        });

        return { extractedText: text || fullText.trim() };
      } catch (error: any) {
        return { error: `Error al procesar el Word (Mammoth/IA): ${error.message}` };
      }
    }

    // 3. Manejo de PDF (.pdf)
    if (currentDataUri.includes('application/pdf') || input.documentName.toLowerCase().endsWith('.pdf')) {
      try {
        const { text, finishReason } = await ai.generate({
          prompt: [
            { text: `Actúa como un transcriptor académico de alta precisión. Extrae TODO el contenido textual educativo de este PDF. Ignora pies de página repetitivos, números de página y elementos puramente decorativos.` },
            { media: { url: currentDataUri, contentType: 'application/pdf' } },
          ],
          config: { temperature: 0.1 },
        });

        if (finishReason !== 'stop') return { error: `Procesamiento de PDF incompleto: ${finishReason}` };
        if (!text || text.trim().length < 10) return { error: 'No se detectó texto extraíble en el PDF.' };

        return { extractedText: text.trim() };
      } catch (error: any) {
        return { error: `Gemini falló al procesar el PDF: ${error.message}` };
      }
    }

    return { error: 'Formato no soportado. Usa PDF (.pdf), Word (.docx) o Texto (.txt).' };
  }
);