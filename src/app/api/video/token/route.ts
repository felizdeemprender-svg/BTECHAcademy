import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/firebase/admin';
import { SignJWT, jwtVerify } from 'jose';
import { rateLimitConfigs } from '@/lib/rate-limit';
import { sanitizeError } from '@/lib/error-sanitizer';

const SECRET_KEY = process.env.VIDEO_TOKEN_SECRET || '';
const encoder = new TextEncoder();

if (!SECRET_KEY || SECRET_KEY.length < 32) {
  console.error('[Video Token] VIDEO_TOKEN_SECRET no configurada o muy corta (mín 32 chars)');
}

async function generateToken(payload: Record<string, any>): Promise<string> {
  if (!SECRET_KEY || SECRET_KEY.length < 32) {
    throw new Error('VIDEO_TOKEN_SECRET no configurada');
  }
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(encoder.encode(SECRET_KEY));
}

async function verifyToken(token: string): Promise<Record<string, any> | null> {
  if (!SECRET_KEY || SECRET_KEY.length < 32) {
    return null;
  }
  try {
    const { payload } = await jwtVerify(token, encoder.encode(SECRET_KEY));
    return payload as Record<string, any>;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Verificar Firebase ID Token (Authorization: Bearer <token>)
// ─────────────────────────────────────────────────────────────────────────────
async function verifyAuth(req: NextRequest): Promise<{ uid: string; role: string } | null> {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.split('Bearer ')[1];
    if (!token) {
      return null;
    }

    const decoded = await getAdminAuth().verifyIdToken(token);
    return {
      uid: decoded.uid,
      role: decoded.role || 'alumno'
    };
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResponse = await rateLimitConfigs.video(request);
    if (rateLimitResponse) return rateLimitResponse;

    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const referrer = request.headers.get('referer');
    const origin = request.headers.get('origin');

    const allowedDomains = [
      'http://localhost:9002',
      'https://FastoriaAcademy-8b329.web.app',
      'https://btechacademy-pro--btechacademy-8b329.us-central1.hosted.app',
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

    if (!videoUrl) {
      return NextResponse.json(
        { error: 'videoUrl es requerido' },
        { status: 400 }
      );
    }

    const uid = auth.uid;

    let videoId = '';
    if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
      if (videoUrl.includes('v=')) videoId = videoUrl.split('v=')[1].split('&')[0];
      else if (videoUrl.includes('youtu.be/')) videoId = videoUrl.split('youtu.be/')[1].split('?')[0];
      else if (videoUrl.includes('embed/')) videoId = videoUrl.split('embed/')[1].split('?')[0];
      else if (videoUrl.includes('/shorts/')) videoId = videoUrl.split('/shorts/')[1].split('?')[0];
    }

    if (!videoId) {
      return NextResponse.json(
        { error: 'URL de video no válida' },
        { status: 400 }
      );
    }

    const tokenPayload = {
      uid,
      videoId,
      courseId: courseId || null
    };

    const token = await generateToken(tokenPayload);

    return NextResponse.json(
      { success: true, token, videoId, expiresAt: Math.floor(Date.now() / 1000) + 7200 },
      {
        headers: {
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'X-XSS-Protection': '1; mode=block',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
          'Content-Security-Policy': "default-src 'self'"
        }
      }
    );

  } catch (err: any) {
    console.error('Error generando token de video:', err);
    const { message, status } = sanitizeError(err, 'video/token');
    return NextResponse.json({ error: message }, { status });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json(
      { error: 'Token es requerido' },
      { status: 400 }
    );
  }

  const payload = await verifyToken(token);

  if (!payload) {
    return NextResponse.json(
      { error: 'Token inválido o expirado' },
      { status: 401 }
    );
  }

  return NextResponse.json({
    valid: true,
    videoId: payload.videoId,
    uid: payload.uid,
    courseId: payload.courseId
  });
}