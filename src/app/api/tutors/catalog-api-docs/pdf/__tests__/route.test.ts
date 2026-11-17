import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../route';

vi.mock('@/lib/app-url', () => ({
  getAppBaseUrl: vi.fn().mockReturnValue('https://api.felizdeemprender.com'),
}));

describe('/api/tutors/catalog-api-docs/pdf route', () => {
  it('returns 200 with application/pdf headers and attachment filename', async () => {
    const req = new NextRequest('http://localhost:9002/api/tutors/catalog-api-docs/pdf');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/pdf');
    expect(res.headers.get('Content-Disposition')).toContain('Guia-Integracion-API-Catalogo.pdf');

    const buffer = await res.arrayBuffer();
    expect(buffer.byteLength).toBeGreaterThan(1000);
    const magic = String.fromCharCode(...new Uint8Array(buffer).slice(0, 5));
    expect(magic).toBe('%PDF-');
  });

  it('respects x-forwarded-host header if provided', async () => {
    const req = new NextRequest('http://localhost:9002/api/tutors/catalog-api-docs/pdf', {
      headers: {
        'x-forwarded-host': 'custom.felizdeemprender.com',
        'x-forwarded-proto': 'https',
      },
    });
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/pdf');
  });
});
