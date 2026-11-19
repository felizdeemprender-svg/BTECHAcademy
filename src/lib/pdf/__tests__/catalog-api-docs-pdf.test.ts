import { describe, it, expect } from 'vitest';
import { generateCatalogApiDocsPdf } from '../catalog-api-docs-pdf';
import { PDFDocument } from 'pdf-lib';

describe('generateCatalogApiDocsPdf', () => {
  it('generates a valid 3-page PDF with custom baseUrl', async () => {
    const pdfBytes = await generateCatalogApiDocsPdf({
      baseUrl: 'https://test-api.felizdeemprender.com',
    });

    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(1000);

    const doc = await PDFDocument.load(pdfBytes);
    expect(doc.getPageCount()).toBe(3);

    // Verify PDF header magic bytes %PDF-
    const header = String.fromCharCode(...pdfBytes.slice(0, 5));
    expect(header).toBe('%PDF-');
  });

  it('generates a valid PDF with default options', async () => {
    const pdfBytes = await generateCatalogApiDocsPdf();
    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(1000);
    const doc = await PDFDocument.load(pdfBytes);
    expect(doc.getPageCount()).toBe(3);
  });
});
