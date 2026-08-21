/**
 * Evolution API / Baileys Client
 * Gestiona la conexión y envío de mensajes vía WhatsApp para cada tutor.
 */

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || 'global-api-key-here';

export interface WhatsAppInstance {
  instanceName: string; // Típicamente tutorId
  status: 'open' | 'connecting' | 'close';
  qrcode?: string; // QR en base64 para que el tutor escanee
  phone?: string;
  profilePicUrl?: string;
}

/**
 * Obtiene el estado de la conexión de un tutor
 */
export async function getWhatsAppStatus(tutorId: string): Promise<WhatsAppInstance> {
  const instanceName = `tutor-${tutorId}`;
  
  try {
    const response = await fetch(`${EVOLUTION_API_URL}/instance/fetchInstances?instanceName=${instanceName}`, {
      headers: {
        'apikey': EVOLUTION_API_KEY
      }
    });
    
    if (!response.ok) {
      return { instanceName, status: 'close' };
    }
    
    const data = await response.json();
    if (!data || data.length === 0) {
      return { instanceName, status: 'close' };
    }

    const instanceData = data[0];
    const status = instanceData.connectionStatus || 'close';
    
    let phone = undefined;
    if (instanceData.ownerJid) {
      phone = instanceData.ownerJid.split('@')[0];
    }

    return {
      instanceName,
      status: status,
      phone: phone,
      profilePicUrl: instanceData.profilePicUrl || undefined
    };
  } catch (error) {
    console.error(`Error verificando estado de WhatsApp para ${instanceName}:`, error);
    return { instanceName, status: 'close' };
  }
}

/**
 * Crea una nueva instancia y retorna el código QR
 */
export async function connectWhatsApp(tutorId: string): Promise<WhatsAppInstance> {
  const instanceName = `tutor-${tutorId}`;
  
  try {
    // 1. Intentar crear la instancia
    await fetch(`${EVOLUTION_API_URL}/instance/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY
      },
      body: JSON.stringify({
        instanceName,
        token: instanceName, // Usamos el nombre como token para simplificar en este boilerplate
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS'
      })
    });

    // 2. Conectar (esto devuelve el QR en base64 en Evolution V2)
    const connectResponse = await fetch(`${EVOLUTION_API_URL}/instance/connect/${instanceName}`, {
      headers: {
        'apikey': EVOLUTION_API_KEY
      }
    });
    
    const data = await connectResponse.json();
    
    return {
      instanceName,
      status: 'connecting',
      qrcode: data?.base64 // El QR listo para renderizar en un <img src={qrcode} />
    };
  } catch (error) {
    console.error(`Error conectando WhatsApp para ${instanceName}:`, error);
    throw new Error('Fallo al conectar con Evolution API');
  }
}

/**
 * Envía un mensaje de texto puro
 * No guarda rastro en memoria del contenedor, ideal para evitar saturación de RAM
 */
export async function sendWhatsAppMessage(tutorId: string, phone: string, message: string): Promise<boolean> {
  const instanceName = `tutor-${tutorId}`;
  
  try {
    // Formatear el teléfono
    const formattedPhone = phone.replace(/[^0-9]/g, ''); // Remover +, -, espacios

    const response = await fetch(`${EVOLUTION_API_URL}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY
      },
      body: JSON.stringify({
        number: formattedPhone,
        options: {
          delay: 1200, // Añadir delay sutil para parecer humano
          presence: 'composing' // Mostrar "escribiendo..." en el chat del usuario
        },
        text: message
      })
    });

    return response.ok;
  } catch (error) {
    console.error(`Error enviando mensaje WhatsApp desde ${instanceName}:`, error);
    return false;
  }
}

/**
 * Cierra sesión (Logout)
 */
export async function disconnectWhatsApp(tutorId: string): Promise<boolean> {
  const instanceName = `tutor-${tutorId}`;
  try {
    await fetch(`${EVOLUTION_API_URL}/instance/logout/${instanceName}`, {
      method: 'DELETE',
      headers: { 'apikey': EVOLUTION_API_KEY }
    });
    return true;
  } catch (error) {
    return false;
  }
}
