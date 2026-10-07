import { CloudTasksClient } from '@google-cloud/tasks';

// Inicializar el cliente de Cloud Tasks.
// Si se corre localmente, requiere que GOOGLE_APPLICATION_CREDENTIALS esté apuntando al archivo de credenciales,
// o que se provean credenciales en el constructor de manera segura.
const client = new CloudTasksClient();

interface VideoTaskPayload {
  campaignId: string;
  courseId: string;
  assets: any; 
  // Podríamos incluir más parámetros según la necesidad
  [key: string]: any;
}

/**
 * Encola un trabajo en Google Cloud Tasks para que se procese en segundo plano.
 * @param payload Datos necesarios para renderizar el contenido.
 */
export async function enqueueVideoTask(payload: VideoTaskPayload) {
  const project = process.env.GCP_PROJECT_ID || 'felizdeemprender-svg';
  const location = process.env.GCP_LOCATION || 'us-central1';
  const queue = process.env.GCP_TASK_QUEUE || 'video-worker-queue';

  // Construir el path de la cola en Google Cloud
  const parent = client.queuePath(project, location, queue);

  // Determinar la URL del worker. 
  // En Vercel usamos VERCEL_URL. En local, deberíamos usar un túnel (como ngrok) o la IP del VPS.
  const workerUrl = process.env.WORKER_URL 
    ? process.env.WORKER_URL 
    : (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}/api/video/worker` : 'http://localhost:9002/api/video/worker');

  const task = {
    httpRequest: {
      httpMethod: 'POST' as const,
      url: workerUrl,
      headers: {
        'Content-Type': 'application/json',
        // Clave secreta para que el worker rechace peticiones externas que no sean de Cloud Tasks
        'Authorization': `Bearer ${process.env.WORKER_SECRET || 'fastoria-video-worker-local-secret'}`,
      },
      // El payload debe enviarse como string en base64
      body: Buffer.from(JSON.stringify(payload)).toString('base64'),
    },
  };

  try {
    console.log(`[CloudTasks] Encolando tarea para campaña: ${payload.campaignId}`);
    console.log(`[CloudTasks] Destino del Worker: ${workerUrl}`);
    
    // Fallback para entorno local (evitar error PERMISSION_DENIED)
    if (process.env.NODE_ENV !== 'production' || workerUrl.includes('localhost')) {
      console.log(`[CloudTasks] Entorno local detectado. Ejecutando Fetch directo (Fire-and-Forget)...`);
      
      fetch(workerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': task.httpRequest.headers.Authorization
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(3600000)
      }).catch(e => {
        // En Node.js 18+, fetch tiene un timeout duro de 5 minutos para los headers (UND_ERR_HEADERS_TIMEOUT).
        // Como estamos haciendo "Fire-and-Forget" intencionalmente, ignoramos este timeout para no ensuciar los logs.
        if (e.cause?.code !== 'UND_ERR_HEADERS_TIMEOUT') {
          console.error('[CloudTasks Local Fallback] Error ejecutando worker:', e);
        }
      });

      return { success: true, taskName: `local-task-${Date.now()}` };
    }

    // Crear la tarea en la cola
    const [response] = await client.createTask({ parent, task });
    console.log(`[CloudTasks] Tarea encolada con éxito. ID: ${response.name}`);
    
    return { success: true, taskName: response.name };
  } catch (error: any) {
    console.error('[CloudTasks] Fallo al crear la tarea:', error.message);
    throw new Error(`Error encolando tarea: ${error.message}`);
  }
}
