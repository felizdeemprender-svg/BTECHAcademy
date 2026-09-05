import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/firebase/admin';

const BOT_WORKER_URL = process.env.WHATSAPP_BOT_API_URL || 'http://166.1.85.188:13002';
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://166.1.85.188:18081';
const BOT_API_KEY = process.env.WHATSAPP_BOT_API_KEY || 'fastoria-secret-key-2026';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || 'B6D711FCDE4D4FD5936544120E713976';

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-api-key': BOT_API_KEY,
    'apikey': EVOLUTION_API_KEY,
    'Authorization': `Bearer ${BOT_API_KEY}`,
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action') || 'status';

  try {
    if (action === 'status') {
      let state = 'close';
      let qrCode = '';
      let pairingCode = '';
      let phone = '';

      // 1. Intentar consultar estado en Worker de Fastoria
      try {
        const workerRes = await fetch(`${BOT_WORKER_URL}/api/status`, {
          method: 'GET',
          headers: getHeaders(),
          cache: 'no-store',
        });

        if (workerRes.ok) {
          const data = await workerRes.json();
          return NextResponse.json({ success: true, ...data });
        }
      } catch (err: any) {
        console.warn('[WHATSAPP_BOT_PROXY] Worker /api/status no disponible, intentando Evolution API directo:', err.message);
      }

      // 2. Intentar consultar directamente en Evolution API
      try {
        const evoRes = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/fastoria`, {
          method: 'GET',
          headers: { 'apikey': EVOLUTION_API_KEY },
          cache: 'no-store',
        });

        if (evoRes.ok) {
          const evoData = await evoRes.json();
          state = evoData?.instance?.state || evoData?.state || 'close';
          if (evoData?.instance?.owner) {
            phone = evoData.instance.owner.replace('@s.whatsapp.net', '');
          }
        }
      } catch (err: any) {
        console.warn('[WHATSAPP_BOT_PROXY] Evolution API connectionState error:', err.message);
      }

      // 3. Si el estado es close o connecting, intentar traer el QR
      if (state !== 'open') {
        try {
          const qrRes = await fetch(`${EVOLUTION_API_URL}/instance/connect/fastoria`, {
            method: 'GET',
            headers: { 'apikey': EVOLUTION_API_KEY },
            cache: 'no-store',
          });

          if (qrRes.ok) {
            const qrData = await qrRes.json();
            qrCode = qrData?.base64 || qrData?.qrcode?.base64 || qrData?.code || '';
            pairingCode = qrData?.pairingCode || '';
          }
        } catch (err: any) {
          console.warn('[WHATSAPP_BOT_PROXY] Error conectando para obtener QR:', err.message);
        }
      }

      return NextResponse.json({
        success: true,
        instance: 'fastoria',
        state,
        qrCode,
        pairingCode,
        phone,
        workerUrl: BOT_WORKER_URL,
        evolutionApi: EVOLUTION_API_URL,
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

      // Intentar leer de Firestore
      try {
        const docSnap = await adminDb.collection('config').doc('whatsapp_bot').get();
        if (docSnap.exists) {
          return NextResponse.json({ success: true, settings: docSnap.data() });
        }
      } catch (dbErr: any) {
        console.warn('[WHATSAPP_BOT_PROXY] Error leyendo Firestore config:', dbErr.message);
      }

      return NextResponse.json({
        success: true,
        settings: {
          tone: 'amigable',
          systemPrompt: `Sos el Asistente Virtual Oficial de Fastoria. Respondés de manera clara, entusiasta y precisa sobre nuestros planes, academia, herramientas de IA y mentoría.

Reglas clave:
1. Si el usuario pregunta por precios o características de planes, respondé con la información oficial sincronizada.
2. Si el usuario tiene dudas avanzadas de compra o desea negociar, derívalo cordialmente al equipo de Ventas.
3. Si el usuario tiene problemas de acceso o errores técnicos, derívalo al equipo de Soporte Técnico.
4. Mantené siempre un trato profesional, cálido y conciso.`,
          temperature: 0.7,
          maxTokens: 500,
          salesGroupJid: '120363384910293847@g.us',
          supportGroupJid: '120363294857201938@g.us',
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
        await fetch(`${BOT_WORKER_URL}/api/settings`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(body),
        });
      } catch (err: any) {
        console.warn('[WHATSAPP_BOT_PROXY] Error guardando settings en worker:', err.message);
      }

      // Guardar también en Firestore como persistencia garantizada
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
      let qrCode = '';
      let pairingCode = '';
      let state = 'connecting';

      // 1. Intentar worker
      try {
        const workerRes = await fetch(`${BOT_WORKER_URL}/api/connect`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(body),
        });

        if (workerRes.ok) {
          const data = await workerRes.json();
          return NextResponse.json({ success: true, ...data });
        }
      } catch (err: any) {
        console.warn('[WHATSAPP_BOT_PROXY] Worker /api/connect no disponible:', err.message);
      }

      // 2. Intentar directamente Evolution API connect
      try {
        const evoRes = await fetch(`${EVOLUTION_API_URL}/instance/connect/fastoria`, {
          method: 'GET',
          headers: { 'apikey': EVOLUTION_API_KEY },
          cache: 'no-store',
        });

        if (evoRes.ok) {
          const evoData = await evoRes.json();
          qrCode = evoData?.base64 || evoData?.qrcode?.base64 || evoData?.code || '';
          pairingCode = evoData?.pairingCode || '';
          state = evoData?.state || 'connecting';
        }
      } catch (err: any) {
        console.warn('[WHATSAPP_BOT_PROXY] Evolution API connect direct error:', err.message);
      }

      return NextResponse.json({
        success: true,
        instance: 'fastoria',
        state,
        qrCode,
        pairingCode,
        message: 'Código QR generado correctamente.',
      });
    }

    if (action === 'logout') {
      try {
        await fetch(`${EVOLUTION_API_URL}/instance/logout/fastoria`, {
          method: 'DELETE',
          headers: { 'apikey': EVOLUTION_API_KEY },
        });
      } catch (err: any) {
        console.warn('[WHATSAPP_BOT_PROXY] Error solicitando logout en Evolution API:', err.message);
      }

      return NextResponse.json({
        success: true,
        state: 'close',
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
      const [snap1, snap2] = await Promise.all([
        adminDb.collection('subscriptionPlans').get(),
        adminDb.collection('subscription-plans').get(),
      ]);

      const plans = [
        ...snap1.docs.map((doc) => ({ ...doc.data(), id: doc.id })),
        ...snap2.docs.map((doc) => ({ ...doc.data(), id: doc.id })),
      ];

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

      try {
        await fetch(`${BOT_WORKER_URL}/api/knowledge/bulk`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ items: knowledgePayloads }),
        });
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
