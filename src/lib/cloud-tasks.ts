export interface VideoTaskPayload {
  campaignId?: string;
  courseId?: string;
  assets?: any; 
  action?: string;
  jobId?: string;
  renderRequest?: any;
  [key: string]: any;
}

let cachedTasksClient: any = null;

async function getCloudTasksClient() {
  if (cachedTasksClient) return cachedTasksClient;
  try {
    const { CloudTasksClient } = await import('@google-cloud/tasks');
    cachedTasksClient = new CloudTasksClient();
    return cachedTasksClient;
  } catch (err: any) {
    console.warn('[CloudTasks] No se pudo instanciar CloudTasksClient (se usará invocación directa):', err?.message);
    return null;
  }
}

/**
 * Encola un trabajo en Google Cloud Tasks o lo despacha de forma asíncrona al worker.
 * @param payload Datos necesarios para procesar la campaña en segundo plano.
 */
export async function enqueueVideoTask(payload: VideoTaskPayload) {
  const workerSecret = process.env.WORKER_SECRET || 'fastoria-video-worker-local-secret';
  const authHeader = `Bearer ${workerSecret}`;

  // Determinar URL de destino del worker
  // IMPORTANTE: En Cloud Run / App Hosting, una llamada a 127.0.0.1 NO pasa por el
  // Google Front End (Ingress), por lo que Cloud Run considera que no hay requests
  // externos activos y aplica CPU Throttling (~1% CPU) o apaga la instancia a mitad de FFmpeg.
  // Siempre priorizar la URL pública HTTPS (origin del request o NEXT_PUBLIC_APP_URL).
  const localPort = process.env.PORT || '9002';

  let workerUrl = process.env.WORKER_URL;
  if (!workerUrl) {
    if (payload.origin && payload.origin.startsWith('https://')) {
      workerUrl = `${payload.origin.replace(/\/$/, '')}/api/video/worker`;
    } else if (process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes('localhost')) {
      workerUrl = `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}/api/video/worker`;
    } else if (process.env.VERCEL_URL) {
      workerUrl = `https://${process.env.VERCEL_URL}/api/video/worker`;
    } else if (process.env.NODE_ENV === 'production') {
      workerUrl = 'https://fastoria.com.ar/api/video/worker';
    } else {
      workerUrl = `http://127.0.0.1:${localPort}/api/video/worker`;
    }
  }

  const gcpProject = process.env.GCP_PROJECT_ID;
  const gcpQueue = process.env.GCP_TASK_QUEUE;

  // Intentar Cloud Tasks SOLO si está explícitamente configurada la cola en GCP
  if (process.env.NODE_ENV === 'production' && gcpProject && gcpQueue) {
    try {
      const client = await getCloudTasksClient();
      if (client) {
        const location = process.env.GCP_LOCATION || 'us-central1';
        const parent = client.queuePath(gcpProject, location, gcpQueue);

        const task = {
          httpRequest: {
            httpMethod: 'POST' as const,
            url: workerUrl,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': authHeader,
            },
            body: Buffer.from(JSON.stringify(payload)).toString('base64'),
          },
        };

        console.log(`[CloudTasks] Encolando tarea para: ${payload.campaignId || payload.jobId || 'tarea'} en cola GCP ${gcpQueue}`);
        const [response] = await client.createTask({ parent, task });
        console.log(`[CloudTasks] Tarea encolada con éxito en GCP. ID: ${response.name}`);
        return { success: true, taskName: response.name };
      }
    } catch (gcpErr: any) {
      console.warn(`[CloudTasks] Falló encolar en GCP Tasks (${gcpErr.message}). Pasando a fallback directo...`);
    }
  }

  // Fallback directo asíncrono (Fire-and-Forget) hacia el Worker:
  // Aguardamos brevemente (~300ms) para garantizar que el handshake TLS y el body HTTP
  // salgan hacia el Ingress de Cloud Run antes de que el endpoint llamador cierre su request.
  try {
    console.log(`[CloudTasks] Ejecutando worker vía fetch directo (Fire-and-Forget): ${workerUrl}`);
    
    const workerFetch = fetch(workerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(3600000)
    }).then(res => {
      if (!res.ok) {
        throw new Error(`Worker HTTP ${res.status}`);
      }
      return res;
    });

    workerFetch.catch(e => {
      if (e?.cause?.code !== 'UND_ERR_HEADERS_TIMEOUT') {
        console.error('[CloudTasks Direct] Error de conexión con worker:', e?.message || e);
      }
    });

    await Promise.race([
      workerFetch,
      new Promise(resolve => setTimeout(resolve, 350))
    ]);

    return { success: true, taskName: `direct-task-${Date.now()}` };
  } catch (error: any) {
    console.error('[CloudTasks] Error al disparar worker directo:', error.message);
    throw new Error(`Error encolando tarea: ${error.message}`);
  }
}
