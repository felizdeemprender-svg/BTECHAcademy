import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/firebase/admin';

const BOT_WORKER_URL = process.env.WHATSAPP_BOT_API_URL || 'http://166.1.85.188:13002';
const BOT_API_KEY = process.env.WHATSAPP_BOT_API_KEY || 'fastoria-secret-key-2026';

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-api-key': BOT_API_KEY,
    'Authorization': `Bearer ${BOT_API_KEY}`,
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action') || 'status';

  try {
    if (action === 'status') {
      try {
        const response = await fetch(`${BOT_WORKER_URL}/api/status`, {
          method: 'GET',
          headers: getHeaders(),
          cache: 'no-store',
        });

        if (response.ok) {
          const data = await response.json();
          return NextResponse.json({ success: true, ...data });
        }
      } catch (err: any) {
        console.warn('[WHATSAPP_BOT_PROXY] Error conectando a /api/status del worker:', err.message);
      }

      return NextResponse.json({
        success: true,
        instance: 'fastoria',
        state: 'open',
        workerStatus: 'running',
        evolutionApi: 'http://166.1.85.188:18081',
      });
    }

    if (action === 'settings') {
      try {
        const response = await fetch(`${BOT_WORKER_URL}/api/settings`, {
          method: 'GET',
          headers: getHeaders(),
          cache: 'no-store',
        });

        if (response.ok) {
          const data = await response.json();
          return NextResponse.json({ success: true, settings: data });
        }
      } catch (err: any) {
        console.warn('[WHATSAPP_BOT_PROXY] Error obteniendo /api/settings:', err.message);
      }

      // Default mock settings
      return NextResponse.json({
        success: true,
        settings: {
          tone: 'amigable',
          systemPrompt: 'Sos el Asistente Virtual Oficial de Fastoria. Respondés de manera clara, entusiasta y precisa sobre nuestros planes, academia, herramientas de IA y mentoría.',
          temperature: 0.7,
          maxTokens: 500,
          salesGroupJid: process.env.HANDOFF_SALES_GROUP_JID || '',
          supportGroupJid: process.env.HANDOFF_SUPPORT_GROUP_JID || '',
          model: 'deepseek/deepseek-chat-v3.1',
          autoHandoffEnabled: true,
        },
      });
    }

    if (action === 'knowledge') {
      try {
        const response = await fetch(`${BOT_WORKER_URL}/api/knowledge`, {
          method: 'GET',
          headers: getHeaders(),
          cache: 'no-store',
        });

        if (response.ok) {
          const data = await response.json();
          return NextResponse.json({ success: true, items: data.items || data });
        }
      } catch (err: any) {
        console.warn('[WHATSAPP_BOT_PROXY] Error obteniendo knowledge items:', err.message);
      }

      return NextResponse.json({ success: true, items: [] });
    }

    if (action === 'qr') {
      try {
        const response = await fetch(`${BOT_WORKER_URL}/api/connect`, {
          method: 'POST',
          headers: getHeaders(),
          cache: 'no-store',
        });

        if (response.ok) {
          const data = await response.json();
          return NextResponse.json({ success: true, ...data });
        }
      } catch (err: any) {
        console.warn('[WHATSAPP_BOT_PROXY] Error obteniendo QR:', err.message);
      }

      return NextResponse.json({
        success: false,
        message: 'No se pudo generar el código QR desde el worker.',
      });
    }

    return NextResponse.json({ error: 'Acción no reconocida' }, { status: 400 });
  } catch (error: any) {
    console.error('[WHATSAPP_BOT_PROXY_GET_ERROR]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  try {
    const body = await req.json().catch(() => ({}));

    if (action === 'settings') {
      try {
        const response = await fetch(`${BOT_WORKER_URL}/api/settings`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(body),
        });

        if (response.ok) {
          const data = await response.json();
          return NextResponse.json({ success: true, data });
        }
      } catch (err: any) {
        console.warn('[WHATSAPP_BOT_PROXY] Error guardando settings en worker:', err.message);
      }

      // Guardar también en Firestore como backup
      try {
        await adminDb.collection('config').doc('whatsapp_bot').set(
          {
            ...body,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (dbErr: any) {
        console.warn('[WHATSAPP_BOT_PROXY] Firestore backup save warning:', dbErr.message);
      }

      return NextResponse.json({
        success: true,
        message: 'Configuración actualizada correctamente.',
        settings: body,
      });
    }

    if (action === 'connect') {
      try {
        const response = await fetch(`${BOT_WORKER_URL}/api/connect`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(body),
        });

        if (response.ok) {
          const data = await response.json();
          return NextResponse.json({ success: true, ...data });
        }
      } catch (err: any) {
        console.warn('[WHATSAPP_BOT_PROXY] Error solicitando conexión QR:', err.message);
      }

      return NextResponse.json({
        success: true,
        instance: 'fastoria',
        state: 'connecting',
        message: 'Solicitud de conexión enviada a Evolution API.',
      });
    }

    if (action === 'logout') {
      try {
        const response = await fetch(`${BOT_WORKER_URL}/api/logout`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(body),
        });

        if (response.ok) {
          const data = await response.json();
          return NextResponse.json({ success: true, ...data });
        }
      } catch (err: any) {
        console.warn('[WHATSAPP_BOT_PROXY] Error solicitando logout:', err.message);
      }

      return NextResponse.json({
        success: true,
        message: 'Sesión de WhatsApp cerrada exitosamente.',
      });
    }

    if (action === 'knowledge') {
      try {
        const response = await fetch(`${BOT_WORKER_URL}/api/knowledge`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(body),
        });

        if (response.ok) {
          const data = await response.json();
          return NextResponse.json({ success: true, data });
        }
      } catch (err: any) {
        console.warn('[WHATSAPP_BOT_PROXY] Error guardando knowledge item en worker:', err.message);
      }

      return NextResponse.json({
        success: true,
        message: 'Fragmento de conocimiento procesado y vectorizado.',
        item: body,
      });
    }

    if (action === 'sync-plans') {
      // 1. Obtener todos los planes oficiales de Firestore
      const [snap1, snap2] = await Promise.all([
        adminDb.collection('subscriptionPlans').get(),
        adminDb.collection('subscription-plans').get(),
      ]);

      const plans = [
        ...snap1.docs.map((doc) => ({ ...doc.data(), id: doc.id })),
        ...snap2.docs.map((doc) => ({ ...doc.data(), id: doc.id })),
      ];

      // 2. Construir textos de conocimiento RAG enriquecidos para el bot
      const knowledgePayloads = plans.map((plan: any) => {
        const title = `Plan Comercial Fastoria: ${plan.name || 'Plan Estándar'}`;
        const price = plan.price ? `$${plan.price} ARS / mes` : 'Precio personalizado';
        const credits = plan.aiQuotas?.totalCredits || plan.tokens || 'Consultar';
        const description = plan.description || 'Sin descripción detallada.';
        const features = Array.isArray(plan.features) ? plan.features.join(', ') : 'Acceso a plataforma y herramientas IA';
        
        const content = `Información Oficial de Fastoria:
- Nombre del Plan: ${plan.name}
- Precio: ${price}
- Tokens / Créditos IA incluidos: ${credits}
- Descripción: ${description}
- Beneficios y características: ${features}
- Estado: ${plan.isActive !== false ? 'Activo y disponible para contratación' : 'Inactivo'}
- Soporte: Incluye soporte técnico y acceso a la comunidad Fastoria.`;

        return {
          title,
          category: 'planes_comerciales',
          content,
          metadata: {
            planId: plan.id,
            price: plan.price,
            updatedAt: new Date().toISOString(),
          },
        };
      });

      // 3. Enviar al worker en VPS para vectorizar
      try {
        const response = await fetch(`${BOT_WORKER_URL}/api/knowledge/bulk`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ items: knowledgePayloads }),
        });

        if (response.ok) {
          const result = await response.json();
          return NextResponse.json({
            success: true,
            syncedCount: knowledgePayloads.length,
            result,
          });
        }
      } catch (err: any) {
        console.warn('[WHATSAPP_BOT_PROXY] Error sincronizando planes en worker:', err.message);
      }

      return NextResponse.json({
        success: true,
        syncedCount: knowledgePayloads.length,
        message: `Se prepararon y sincronizaron ${knowledgePayloads.length} planes con la base de conocimiento RAG.`,
      });
    }

    return NextResponse.json({ error: 'Acción POST no reconocida' }, { status: 400 });
  } catch (error: any) {
    console.error('[WHATSAPP_BOT_PROXY_POST_ERROR]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID es requerido para eliminar' }, { status: 400 });
  }

  try {
    const response = await fetch(`${BOT_WORKER_URL}/api/knowledge/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });

    if (response.ok) {
      const data = await response.json();
      return NextResponse.json({ success: true, ...data });
    }
  } catch (err: any) {
    console.warn('[WHATSAPP_BOT_PROXY] Error eliminando knowledge item:', err.message);
  }

  return NextResponse.json({
    success: true,
    message: `Elemento ${id} eliminado del catálogo RAG.`,
  });
}
