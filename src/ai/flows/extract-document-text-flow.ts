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
  async (input: any) => {
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

        // Extracción de texto usando mammoth (rápida, limpia y determinista)
        const result = await mammoth.extractRawText({ buffer });
        let fullText = (result.value || '').trim();
        
        if (!fullText || fullText.length < 10) {
          throw new Error('No se pudo extraer suficiente texto del documento Word.');
        }

        // Normalizar saltos de línea excesivos
        fullText = fullText.replace(/\n{3,}/g, '\n\n');

        // Para evitar desbordar el contexto de la IA y prevenir timeouts en Cloud Run,
        // acotamos el texto del syllabus a un máximo óptimo de 12.000 caracteres
        if (fullText.length > 12000) {
          fullText = fullText.substring(0, 12000) + '\n\n[... Contenido del temario truncado para optimización ...]';
        }

        return { extractedText: fullText };
      } catch (error: any) {
        return { error: `Error al procesar el Word (Mammoth): ${error.message}` };
      }
    }

    return { error: 'Formato no soportado para Archivo Maestro. Usa únicamente Word (.docx) o Texto (.txt).' };
  }
);