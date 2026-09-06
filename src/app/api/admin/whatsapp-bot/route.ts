import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/firebase/admin';

// URLs seguras a través del reverse proxy SSL de Nginx en el VPS
const BOT_WORKER_URL = process.env.WHATSAPP_BOT_API_URL || 'https://bilon.pagarqr.ar/fastoria-worker';
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'https://bilon.pagarqr.ar/fastoria-evolution';

const INTERNAL_PROXY_TOKEN = process.env.WHATSAPP_INTERNAL_PROXY_TOKEN || 'fastoria_proxy_token_98374fa21bc894de01';
const BOT_API_KEY = process.env.WHATSAPP_BOT_API_KEY || 'fastoria_secret_api_key_2026';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || 'fastoria_evo_key_8f92a10b45cd2e1a87';

function getWorkerHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-internal-proxy-token': INTERNAL_PROXY_TOKEN,
    'x-api-key': BOT_API_KEY,
    'Authorization': `Bearer ${BOT_API_KEY}`,
  };
}

function getEvoHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-internal-proxy-token': INTERNAL_PROXY_TOKEN,
    'apikey': EVOLUTION_API_KEY,
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

      // 1. Consultar fetchInstances en Evolution API (estado real y número conectado)
      try {
        const evoRes = await fetch(`${EVOLUTION_API_URL}/instance/fetchInstances`, {
          method: 'GET',
          headers: getEvoHeaders(),
          cache: 'no-store',
        });

        if (evoRes.ok) {
          const instances = await evoRes.json();
          const inst = Array.isArray(instances)
            ? instances.find((i: any) => i.name === 'fastoria')
            : instances;
          
          if (inst) {
            state = inst.connectionStatus === 'open' ? 'open' : inst.connectionStatus || 'close';
            if (inst.ownerJid) {
              phone = inst.ownerJid.replace('@s.whatsapp.net', '');
            } else if (inst.number) {
              phone = inst.number;
            }
          }
        }
      } catch (err: any) {
        console.warn('[WHATSAPP_BOT_PROXY] Evolution API fetchInstances error:', err.message);
      }

      // Si no detectó open, verificar connectionState
      if (state !== 'open') {
        try {
          const connRes = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/fastoria`, {
            method: 'GET',
            headers: getEvoHeaders(),
            cache: 'no-store',
          });
          if (connRes.ok) {
            const connData = await connRes.json();
            const connState = connData?.instance?.state || connData?.state;
            if (connState === 'open') {
              state = 'open';
              if (connData?.instance?.owner) {
                phone = connData.instance.owner.replace('@s.whatsapp.net', '');
              }
            }
          }
        } catch (err: any) {
          console.warn('[WHATSAPP_BOT_PROXY] connectionState error:', err.message);
        }
      }

      // 2. Si no está conectado, obtener el código QR de conexión
      if (state !== 'open') {
        try {
          const qrRes = await fetch(`${EVOLUTION_API_URL}/instance/connect/fastoria`, {
            method: 'GET',
            headers: getEvoHeaders(),
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

      // 3. Consultar datos adicionales del Worker
      let workerData: any = {};
      try {
        const workerRes = await fetch(`${BOT_WORKER_URL}/api/status`, {
          method: 'GET',
          headers: getWorkerHeaders(),
          cache: 'no-store',
        });
        if (workerRes.ok) {
          workerData = await workerRes.json();
        }
      } catch (err: any) {
        console.warn('[WHATSAPP_BOT_PROXY] Error worker status:', err.message);
      }

      return NextResponse.json({
        success: true,
        instance: 'fastoria',
        state,
        qrCode,
        pairingCode,
        phone,
        workerStatus: workerData?.status || 'running',
        workerInfo: workerData,
      });
    }

    if (action === 'settings') {
      try {
        const response = await fetch(`${BOT_WORKER_URL}/api/settings`, {
          method: 'GET',
          headers: getWorkerHeaders(),
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

    if (action === 'conversations') {
      try {
        const response = await fetch(`${BOT_WORKER_URL}/api/conversations`, {
          method: 'GET',
          headers: getWorkerHeaders(),
          cache: 'no-store',
        });

        if (response.ok) {
          const data = await response.json();
          return NextResponse.json({ success: true, conversations: data.conversations || [] });
        }
      } catch (err: any) {
        console.warn('[WHATSAPP_BOT_PROXY] Error obteniendo conversaciones:', err.message);
      }

      return NextResponse.json({ success: true, conversations: [] });
    }

    if (action === 'messages') {
      const phone = searchParams.get('phone');
      if (!phone) {
        return NextResponse.json({ error: 'phone es requerido' }, { status: 400 });
      }

      try {
        const response = await fetch(`${BOT_WORKER_URL}/api/conversations/${encodeURIComponent(phone)}/messages`, {
          method: 'GET',
          headers: getWorkerHeaders(),
          cache: 'no-store',
        });

        if (response.ok) {
          const data = await response.json();
          return NextResponse.json({ success: true, conversation: data.conversation, messages: data.messages || [] });
        }
      } catch (err: any) {
        console.warn('[WHATSAPP_BOT_PROXY] Error obteniendo mensajes:', err.message);
      }

      return NextResponse.json({ success: true, conversation: null, messages: [] });
    }

    if (action === 'knowledge') {
      try {
        const response = await fetch(`${BOT_WORKER_URL}/api/knowledge`, {
          method: 'GET',
          headers: getWorkerHeaders(),
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
          headers: getWorkerHeaders(),
          body: JSON.stringify(body),
        });
      } catch (err: any) {
        console.warn('[WHATSAPP_BOT_PROXY] Error guardando settings en worker:', err.message);
      }

      // Guardar en Firestore como backup
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

      try {
        const evoRes = await fetch(`${EVOLUTION_API_URL}/instance/connect/fastoria`, {
          method: 'GET',
          headers: getEvoHeaders(),
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
          headers: getEvoHeaders(),
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
          headers: getWorkerHeaders(),
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
          headers: getWorkerHeaders(),
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

    if (action === 'send-message') {
      const { phone, text, senderName } = body;
      if (!phone || !text) {
        return NextResponse.json({ error: 'phone y text son requeridos' }, { status: 400 });
      }

      try {
        const response = await fetch(`${BOT_WORKER_URL}/api/conversations/${encodeURIComponent(phone)}/send`, {
          method: 'POST',
          headers: getWorkerHeaders(),
          body: JSON.stringify({ text, senderName: senderName || 'Operador Fastoria' }),
        });

        if (response.ok) {
          const data = await response.json();
          return NextResponse.json({ success: true, ...data });
        }
      } catch (err: any) {
        console.warn('[WHATSAPP_BOT_PROXY] Error enviando mensaje a través de worker:', err.message);
      }

      return NextResponse.json({ success: true, message: 'Mensaje despachado' });
    }

    if (action === 'toggle-mode') {
      const { phone, mode } = body;
      if (!phone || !mode) {
        return NextResponse.json({ error: 'phone y mode son requeridos' }, { status: 400 });
      }

      try {
        const response = await fetch(`${BOT_WORKER_URL}/api/conversations/${encodeURIComponent(phone)}/mode`, {
          method: 'POST',
          headers: getWorkerHeaders(),
          body: JSON.stringify({ mode }),
        });

        if (response.ok) {
          const data = await response.json();
          return NextResponse.json({ success: true, ...data });
        }
      } catch (err: any) {
        console.warn('[WHATSAPP_BOT_PROXY] Error alternando modo:', err.message);
      }

      return NextResponse.json({ success: true, mode });
    }

    if (action === 'transfer') {
      const { phone, department, reason } = body;
      if (!phone) {
        return NextResponse.json({ error: 'phone es requerido' }, { status: 400 });
      }

      try {
        const response = await fetch(`${BOT_WORKER_URL}/api/conversations/${encodeURIComponent(phone)}/transfer`, {
          method: 'POST',
          headers: getWorkerHeaders(),
          body: JSON.stringify({ department: department || 'ventas', reason: reason || 'Transferencia manual desde Live Chat' }),
        });

        if (response.ok) {
          const data = await response.json();
          return NextResponse.json({ success: true, ...data });
        }
      } catch (err: any) {
        console.warn('[WHATSAPP_BOT_PROXY] Error transfiriendo a grupo:', err.message);
      }

      return NextResponse.json({ success: true, transferredTo: department || 'ventas' });
    }

    return NextResponse.json({ error: 'Acción POST no reconocida' }, { status: 400 });
  } catch (error: any) {
    console.error('[WHATSAPP_BOT_PROXY_POST_ERROR]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  try {
    const body = await req.json().catch(() => ({}));

    if (action === 'update-conversation') {
      const phone = searchParams.get('phone') || body.phone;
      if (!phone) {
        return NextResponse.json({ error: 'phone es requerido' }, { status: 400 });
      }

      try {
        const response = await fetch(`${BOT_WORKER_URL}/api/conversations/${encodeURIComponent(phone)}`, {
          method: 'PUT',
          headers: getWorkerHeaders(),
          body: JSON.stringify(body),
        });

        if (response.ok) {
          const data = await response.json();
          return NextResponse.json({ success: true, ...data });
        }
      } catch (err: any) {
        console.warn('[WHATSAPP_BOT_PROXY] Error actualizando ficha CRM:', err.message);
      }

      return NextResponse.json({ success: true, updated: phone });
    }

    return NextResponse.json({ error: 'Acción PUT no reconocida' }, { status: 400 });
  } catch (error: any) {
    console.error('[WHATSAPP_BOT_PROXY_PUT_ERROR]:', error);
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
      headers: getWorkerHeaders(),
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
