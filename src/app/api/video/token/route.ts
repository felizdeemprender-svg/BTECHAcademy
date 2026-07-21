import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Clave secreta para firmar tokens (en producción usar variable de entorno)
const SECRET_KEY = process.env.VIDEO_TOKEN_SECRET || 'btech-video-secret-2024-dev';

// Generar token simple (en producción usar JWT real)
function generateToken(payload: any): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  const signature = btoa(`${header}.${body}.${SECRET_KEY}`);
  return `${header}.${body}.${signature}`;
}

// Verificar token
function verifyToken(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = JSON.parse(atob(parts[1]));
    const now = Math.floor(Date.now() / 1000);
    
    if (payload.exp && payload.exp < now) {
      return null; // Token expirado
    }
    
    return payload;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Validar referrer para prevenir peticiones externas
    const referrer = request.headers.get('referer');
    const origin = request.headers.get('origin');
    
    const allowedDomains = [
      'http://localhost:9002',
      'https://FastoriaAcademy-8b329.web.app',
      'https://fastoria.com.ar',
      process.env.NEXT_PUBLIC_APP_URL
    ].filter(Boolean);

    const isAllowedReferrer = allowedDomains.some(domain => 
      (referrer && referrer.includes(domain as string)) || 
      (origin && origin.includes(domain as string))
    ) || process.env.NODE_ENV === 'development';

    if (!isAllowedReferrer && process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Origen no autorizado' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { videoUrl, courseId } = body;

    // Validar campos requeridos
    if (!videoUrl) {
      return NextResponse.json(
        { error: 'videoUrl es requerido' },
        { status: 400 }
      );
    }

    // Obtener UID de las cookies
    const cookieStore = cookies();
    const uid = cookieStore.get('btech_uid')?.value;

    if (!uid) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    // NOTA: En desarrollo simplificamos la validación
    // En producción agregar validación de permisos de curso con Firebase Admin

    // Extraer videoId de la URL
    let videoId = '';
    if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
      if (videoUrl.includes('v=')) videoId = videoUrl.split('v=')[1].split('&')[0];
      else if (videoUrl.includes('youtu.be/')) videoId = videoUrl.split('youtu.be/')[1].split('?')[0];
      else if (videoUrl.includes('embed/')) videoId = videoUrl.split('embed/')[1].split('?')[0];
      else if (videoUrl.includes('/shorts/')) videoId = videoUrl.split('/shorts/')[1].split('?')[0];
    }

    if (!videoId) {
      return NextResponse.json(
        { error: 'URLde video no válida' },
        { status: 400 }
      );
    }

    // Generar token con expiración (2 horas)
    const now = Math.floor(Date.now() / 1000);
    const exp = now + (2 * 60 * 60); // 2 horas

    const tokenPayload = {
      uid,
      videoId,
      courseId: courseId || null,
      iat: now,
      exp
    };

    const token = generateToken(tokenPayload);

    return NextResponse.json({
      success: true,
      token,
      videoId,
      expiresAt: exp
    }, {
      headers: {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Content-Security-Policy': "default-src 'self'"
      }
    });

  } catch (error) {
    console.error('Error generando token de video:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// Validar token (para uso interno)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json(
      { error: 'Token es requerido' },
      { status: 400 }
    );
  }

  const payload = verifyToken(token);

  if (!payload) {
    return NextResponse.json(
      { error: 'Token inválido o expirado' },
      { status: 401 }
    );
  }

  return NextResponse.json({
    valid: true,
    videoId: payload.videoId
  });
}
