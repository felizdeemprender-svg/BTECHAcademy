import { NextResponse } from 'next/server';
import { getWhatsAppStatus, connectWhatsApp, disconnectWhatsApp, sendWhatsAppMessage } from '@/lib/automations/whatsapp-client';

// En un entorno real, obtenemos el tutorId de la sesión (ej. NextAuth o token en header)
// Por ahora, usaremos un mock o lo extraeremos del body/query params para las pruebas
const getMockTutorId = (req: Request) => {
  const url = new URL(req.url);
  return url.searchParams.get('tutorId') || 'ary-test';
};

export async function GET(request: Request) {
  try {
    const tutorId = getMockTutorId(request);
    
    // Obtener el estado actual
    const status = await getWhatsAppStatus(tutorId);
    
    return NextResponse.json({ success: true, data: status });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const tutorId = getMockTutorId(request);
    const body = await request.json();
    const action = body.action; // 'connect' o 'disconnect'

    if (action === 'connect') {
      const result = await connectWhatsApp(tutorId);
      return NextResponse.json({ success: true, data: result });
    } 
    
    if (action === 'disconnect') {
      const result = await disconnectWhatsApp(tutorId);
      return NextResponse.json({ success: result });
    }
    
    if (action === 'test_message') {
      const { phone } = body;
      if (!phone) return NextResponse.json({ success: false, error: 'Número no provisto' }, { status: 400 });
      
      const message = `🤖 *FastoriaAutomations*\n\n¡Hola! Esta es una prueba de conexión exitosa.\nSi recibiste este mensaje, significa que el motor de automatizaciones está 100% operativo y listo para despachar mensajes a tus alumnos.`;
      
      const result = await sendWhatsAppMessage(tutorId, phone, message);
      return NextResponse.json({ success: result });
    }

    return NextResponse.json({ success: false, error: 'Acción no válida' }, { status: 400 });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
