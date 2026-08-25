import { NextResponse } from 'next/server';
import { askEvo } from '@/ai/flows/evo-assistant';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const { message, history } = await req.json();

    if (!message) {
      return NextResponse.json({ success: false, error: 'Mensaje requerido' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const uid = cookieStore.get('btech_uid')?.value;
    const role = (cookieStore.get('btech_role')?.value || 'alumno') as any;

    if (!uid) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

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
  } catch (error: any) {
    console.error('[Evo Chat API Error]', error);
    return NextResponse.json({ success: false, error: error.message || 'Error interno' }, { status: 500 });
  }
}
