import { NextRequest, NextResponse } from 'next/server';
import { generateCatalogApiDocsPdf } from '@/lib/pdf/catalog-api-docs-pdf';
import { getAppBaseUrl } from '@/lib/app-url';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const forwardedHost = req.headers.get('x-forwarded-host');
    const hostHeader = forwardedHost || req.headers.get('host');
    let baseUrl: string;

    if (hostHeader) {
      const forwardedProto = req.headers.get('x-forwarded-proto');
      const protocol = forwardedProto || (hostHeader.includes('localhost') || hostHeader.includes('127.0.0.1') ? 'http' : 'https');
      baseUrl = `${protocol}://${hostHeader}`.replace(/\/$/, '');
    } else {
      baseUrl = getAppBaseUrl();
    }

    const pdfBytes = await generateCatalogApiDocsPdf({ baseUrl });

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="Guia-Integracion-API-Catalogo.pdf"',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('[Catalog API Docs PDF] Error generando PDF:', error);
    return NextResponse.json({ error: 'Error generando documentación en PDF' }, { status: 500 });
  }
}
