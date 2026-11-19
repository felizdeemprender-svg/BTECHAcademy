import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { askEvo } from '@/ai/flows/evo-assistant';
import { getAdminAuth, adminDb } from '@/firebase/admin';
import { rateLimitConfigs } from '@/lib/rate-limit';
import { sanitizeError } from '@/lib/error-sanitizer';

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Verificar Firebase ID Token (Authorization: Bearer <token>)
// ─────────────────────────────────────────────────────────────────────────────
async function verifyAuth(req: NextRequest): Promise<{ uid: string; role: 'alumno' | 'mentor' | 'admin' | 'marketing'; displayName?: string; email?: string } | null> {
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
    
    let role = (decoded.role as string) || '';
    let displayName = decoded.name || '';
    let email = decoded.email || '';

    try {
      const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
      if (userDoc.exists) {
        const userData = userDoc.data() || {};
        displayName = displayName || userData.displayName || userData.name || '';
        email = email || userData.email || '';
        const roles: string[] = userData.roles || (userData.role ? [userData.role] : []);
        if (roles.includes('admin') || userData.role === 'admin') {
          role = 'admin';
        } else if (roles.includes('mentor') || userData.role === 'mentor') {
          role = 'mentor';
        } else if (roles.includes('marketing') || userData.role === 'marketing') {
          role = 'marketing';
        } else if (!role) {
          role = 'alumno';
        }
      }
    } catch (e) {
      console.warn('[Evo Chat Auth] Aviso al consultar Firestore userDoc:', e);
    }

    return {
      uid: decoded.uid,
      role: (role as 'alumno' | 'mentor' | 'admin' | 'marketing') || 'alumno',
      displayName,
      email
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
    const role = auth.role;

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
      uid,
      userDisplayName: auth.displayName,
      userEmail: auth.email,
      currentPath: '/dashboard',
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