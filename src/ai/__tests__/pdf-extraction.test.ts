import { vi, describe, it, expect, afterEach } from 'vitest';
import { extractDocumentText } from '../flows/extract-document-text-flow';

global.fetch = vi.fn() as any;

describe('extractDocumentText (Reglas de Archivo Maestro)', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('rechaza archivos PDF (.pdf) como Archivo Maestro devolviendo error explícito', async () => {
    const fakePdfBase64 = Buffer.from('%PDF-1.4 fake content').toString('base64');
    const res = await extractDocumentText({
      documentName: 'temario.pdf',
      documentDataUri: `data:application/pdf;base64,${fakePdfBase64}`,
    });
    expect(res.extractedText).toBeUndefined();
    expect(res.error).toContain('Formato no soportado para Archivo Maestro');
    expect(res.error).toContain('Word (.docx) o Texto (.txt)');
  });

  it('extrae directamente el contenido de archivos de texto plano (.txt)', async () => {
    const sampleText = 'Módulo 1: Fundamentos de pastelería artesanal y fermentación.';
    const base64Txt = Buffer.from(sampleText, 'utf-8').toString('base64');
    const res = await extractDocumentText({
      documentName: 'maestro.txt',
      documentDataUri: `data:text/plain;base64,${base64Txt}`,
    });
    expect(res.error).toBeUndefined();
    expect(res.extractedText).toBe(sampleText);
  });

  it('maneja errores de descarga por URL sin colapsar el worker', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      statusText: 'Not Found',
    });
    const res = await extractDocumentText({
      documentName: 'doc.docx',
      documentUrl: 'https://fake.url/document.docx',
    });
    expect(res.error).toContain('Error de red institucional: Fallo al descargar desde Storage');
  });
});
