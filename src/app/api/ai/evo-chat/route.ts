import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { askEvo } from '@/ai/flows/evo-assistant';
import { getAdminAuth } from '@/firebase/admin';
import { rateLimitConfigs } from '@/lib/rate-limit';
import { sanitizeError } from '@/lib/error-sanitizer';

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

export async function POST(req: NextRequest) {
  try {
    // Rate limiting (usar config public para chat)
    const rateLimitResponse = await rateLimitConfigs.public(req);
    if (rateLimitResponse) return rateLimitResponse;

    const auth = await verifyAuth(req);
    if (!auth) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const { message, history } = await req.json();

    if (!message) {
      return NextResponse.json({ success: false, error: 'Mensaje requerido' }, { status: 400 });
    }

    const uid = auth.uid;
    const role = (auth.role as 'alumno' | 'mentor' | 'admin' | 'marketing') || 'alumno';

    // Convert history into a string to pass as context
    const chatHistory = history
      ? history.map((h: any) => `${h.role}: ${h.content}`).join('\n')
      : '';

    const enrichedMessage = chatHistory
      ? `Historial reciente:\n${chatHistory}\n\nNueva petición:\n${message}`
      : message;

    const result = await askEvo({
      message: enrichedMessage,
      role,
      currentPath: '/dashboard', // Can be enhanced later to receive from widget
    });

    return NextResponse.json({
      success: true,
      reply: result.response,
      nextSteps: result.nextSteps,
      guardrails: result.guardrails
    });
  } catch (err: any) {
    console.error('[Evo Chat API Error]', err);
    const { message, status } = sanitizeError(err, 'ai/evo-chat');
    return NextResponse.json({ success: false, error: message }, { status });
  }
}