import { NextRequest, NextResponse } from 'next/server';
import { resolveGateway } from '@/lib/api/gateway';
import { CatalogApiKeyGuard } from '@/lib/api/catalog-api-key-guard';
import { GetTutorPublicCatalogUseCase } from '@/domain/catalog/use-cases/get-tutor-public-catalog-use-case';
import { getAppBaseUrl } from '@/lib/app-url';
import type { CatalogOfferType } from '@/domain/catalog/tutor-catalog-api';

export const dynamic = 'force-dynamic';

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin');
  // En peticiones cross-origin desde navegadores, reflejamos el origen remitente
  // para permitir que el tutor consuma su API desde cualquier dominio o entorno
  // (su web externa, localhost, testing, produccion o si el dominio cambia) sin bloqueo de CORS.
  const allowOrigin = origin || '*';

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(req),
  });
}

export async function GET(req: NextRequest) {
  const corsHeaders = getCorsHeaders(req);

  try {
    // 1. Extraer la API Key de las cabeceras o query param
    const authHeader = req.headers.get('Authorization');
    let apiKey = req.headers.get('x-api-key');

    if (!apiKey && authHeader?.startsWith('Bearer ')) {
      apiKey = authHeader.split('Bearer ')[1].trim();
    }
    if (!apiKey) {
      apiKey = req.nextUrl.searchParams.get('api_key');
    }

    // 2. Validar clave y evaluar Circuit Breaker
    const gateway = await resolveGateway();
    const guard = new CatalogApiKeyGuard(gateway);
    const authResult = await guard.validateRequestKey(apiKey);

    if (!authResult.ok || !authResult.tutorId) {
      return NextResponse.json(
        {
          error: authResult.error || 'No autorizado',
          code: authResult.code || 'UNAUTHORIZED',
        },
        {
          status: authResult.status || 401,
          headers: corsHeaders,
        },
      );
    }

    // 3. Parsear filtros opcionales
    const searchParams = req.nextUrl.searchParams;
    const typeParam = searchParams.get('type');
    const idsParam = searchParams.get('ids');
    const limitParam = parseInt(searchParams.get('limit') || '50', 10);

    const types = typeParam
      ? (typeParam
          .split(',')
          .map((t) => t.trim().toLowerCase())
          .filter((t) => ['curso', 'programa', 'mentoria'].includes(t)) as CatalogOfferType[])
      : undefined;

    const ids = idsParam
      ? idsParam
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean)
      : undefined;

    // Resolucion dinamica del dominio base para que funcione en desarrollo, testing y produccion,
    // y se adapte automaticamente si el dominio cambia en el futuro.
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

    // 4. Ejecutar caso de uso de obtención de catálogo vigente
    const useCase = new GetTutorPublicCatalogUseCase(gateway);
    const catalog = await useCase.execute(authResult.tutorId, {
      types,
      ids,
      limit: isNaN(limitParam) ? 50 : limitParam,
      baseUrl,
    });

    if (!catalog) {
      return NextResponse.json(
        { error: 'Tutor no encontrado o sin ofertas públicas' },
        { status: 404, headers: corsHeaders },
      );
    }

    return NextResponse.json(catalog, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error('[API Public Catalog] Error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor procesando el catálogo' },
      { status: 500, headers: corsHeaders },
    );
  }
}
