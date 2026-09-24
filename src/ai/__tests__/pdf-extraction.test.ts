import { vi, describe, it, expect, afterEach } from 'vitest';
import { extractDocumentText } from '../flows/extract-document-text-flow';

vi.mock('pdf-parse', () => {
  return {
    default: vi.fn().mockImplementation(() => {
      throw new Error('pdfparse is not a function (mock error)');
    })
  };
});
global.fetch = vi.fn() as any;

describe('extractDocumentText', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });
  it('should handle pdf-parse failures gracefully without crashing the worker', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/pdf' }),
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(8))
    });
    try {
      await extractDocumentText({ documentName: 'doc.pdf', documentUrl: 'https://fake.url/document.pdf' });
    } catch (error: any) {
      expect(error.message).toContain('Error al procesar el archivo');
    }
  });
});
