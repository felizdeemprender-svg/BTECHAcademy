import { NextRequest, NextResponse } from 'next/server';
import { authenticateCaller } from '@/lib/api/mentor-auth';
import { resolveGateway } from '@/lib/api/gateway';
import { CatalogApiKeyGuard } from '@/lib/api/catalog-api-key-guard';

export const dynamic = 'force-dynamic';

/**
 * GET /api/tutors/catalog-api-key
 * Devuelve el estado actual de la API Key del tutor logueado.
 */
export async function GET(req: NextRequest) {
  try {
    const caller = await authenticateCaller(req);
    if (!caller) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const gateway = await resolveGateway();
    const guard = new CatalogApiKeyGuard(gateway);
    const keyInfo = await guard.getTutorKeyInfo(caller.uid);

    return NextResponse.json({
      apiKey: keyInfo || null,
      hasKey: !!keyInfo,
    });
  } catch (error) {
    console.error('[API Tutor Catalog Key GET] Error:', error);
    return NextResponse.json({ error: 'Error obteniendo clave de API' }, { status: 500 });
  }
}

/**
 * POST /api/tutors/catalog-api-key
 * Genera o regenera la API Key del tutor logueado.
 */
export async function POST(req: NextRequest) {
  try {
    const caller = await authenticateCaller(req);
    if (!caller) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const gateway = await resolveGateway();
    const guard = new CatalogApiKeyGuard(gateway);
    const { rawKey, keyDoc } = await guard.generateOrRegenerateKey(caller.uid);

    return NextResponse.json({
      success: true,
      rawKey,
      keyDoc: {
        keyPrefix: keyDoc.keyPrefix,
        status: keyDoc.status,
        createdAt: keyDoc.createdAt,
      },
      message: 'API Key generada con éxito.',
    });
  } catch (error) {
    console.error('[API Tutor Catalog Key POST] Error:', error);
    return NextResponse.json({ error: 'Error generando clave de API' }, { status: 500 });
  }
}
