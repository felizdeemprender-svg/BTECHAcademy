import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/firebase/admin';
import { rateLimitConfigs } from '@/lib/rate-limit';
import { sanitizeError } from '@/lib/error-sanitizer';
import { GenerateVideoUseCase, GenerateVideoRequest } from '@/domain/video/use-cases/generate-video-use-case';
import { FirestoreVideoJobRepository } from '@/data/firestore/video-job-repo';

/**
 * POST /api/video/generate
 * Router del circuito de invocación.
 * Ahora actúa como un Thin Controller: parsea, autentica y delega al Use Case.
 */

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Verificar Firebase ID Token
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

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/video/generate
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResponse = await rateLimitConfigs.video(req);
    if (rateLimitResponse) return rateLimitResponse;

    const auth = await verifyAuth(req);
    if (!auth) {
      return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 });
    }

    const body: GenerateVideoRequest = await req.json();

    if (!body.cursoId) {
      return NextResponse.json({ success: false, error: 'Falta cursoId.' }, { status: 400 });
    }
    if (!['9:16', '1:1', '16:9', '4:5'].includes(body.formato)) {
      return NextResponse.json({ success: false, error: 'formato debe ser 9:16 | 1:1 | 16:9 | 4:5.' }, { status: 400 });
    }

    // Instanciar dependencias
    const repo = new FirestoreVideoJobRepository();
    const useCase = new GenerateVideoUseCase(repo);

    // Ejecutar el caso de uso
    const result = await useCase.execute(body, auth.uid, auth.role);

    return NextResponse.json({
      success: true,
      jobId: result.jobId,
      branch: result.branch,
      status: result.status,
      message: 'El job fue encolado. Escucha el jobId en Firestore para obtener el resultado.'
    });
  } catch (err: any) {
    console.error('🔥 [Generate] Error al encolar job:', err);
    const { message, status } = sanitizeError(err, 'video/generate');
    return NextResponse.json({ success: false, error: message }, { status });
  }
}