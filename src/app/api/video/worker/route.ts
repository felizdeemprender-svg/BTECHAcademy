import { NextRequest, NextResponse } from 'next/server';
import { GenerateVideoUseCase } from '@/domain/video/use-cases/generate-video-use-case';
import { FirestoreVideoJobRepository } from '@/data/firestore/video-job-repo';

export const maxDuration = 300;

/**
 * POST /api/video/worker
 * Endpoint protegido para Google Cloud Tasks.
 * Aquí ocurre el trabajo pesado sin límites de tiempo de 60s de Vercel/Navegador.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Autenticación M2M (Machine to Machine)
    const authHeader = req.headers.get('Authorization');
    const secret = process.env.WORKER_SECRET || 'fastoria-video-worker-local-secret';
    
    if (authHeader !== `Bearer ${secret}`) {
      console.error('🚫 [VideoWorker] Intento de acceso no autorizado.');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Extraer Payload
    const payload = await req.json();
    console.log('👷‍♂️ [VideoWorker] Iniciando tarea pesada en background:', JSON.stringify(payload).substring(0, 200) + '...');

    const { action, data, uid, role } = payload;
    const googleToken = payload.googleToken || data?.googleToken;

    if (!action) {
      return NextResponse.json({ error: 'Falta parámetro action' }, { status: 400 });
    }

    // 3. Orquestador de Acciones
    if (action === 'generate-full-campaign') {
      const { campaignId, targetAudience, campaignMission } = payload;
      console.log(`[VideoWorker] Generando scripts para la campaña completa: ${campaignId}`);
      
      const { generateVariantContent } = await import('@/ai/flows/generate-variant-content');
      const { adminDb } = await import('@/firebase/admin');
      const { enqueueVideoTask } = await import('@/lib/cloud-tasks');
      
      // 0. El "Agente Investigador": Recolectar datos del producto
      const spDoc = await adminDb.collection('salesPages').doc(campaignId).get();
      let courseTitle = 'Curso/Producto';
      let productData = { price: 0, productType: 'course' };
      let courseId = '';

      if (spDoc.exists) {
        const spData = spDoc.data() || {};
        courseTitle = spData.title || courseTitle;
        productData.price = spData.price || 0;
        productData.productType = spData.productType || 'course';
        courseId = spData.courseId || spData.productId || campaignId;
        
        // Si no tiene precio pero está enlazado a un curso real, busquémoslo
        if (!productData.price && spData.courseId) {
           const courseDoc = await adminDb.collection('courses').doc(spData.courseId).get();
           if (courseDoc.exists) {
             productData.price = courseDoc.data()?.price || 0;
           } else {
             const followupDoc = await adminDb.collection('followups').doc(spData.courseId).get();
             if (followupDoc.exists) {
               productData.price = followupDoc.data()?.price || 0;
             }
           }
        }
      }
      
      const assets = data;
      let socials = assets.socials || [];
      const { coordinationPlan } = payload;
      
      // 1. Asignar un assetId único a cada social si no lo tiene
      socials = socials.map((s: any) => ({ ...s, id: s.id || Math.random().toString(36).substring(2, 10), salesPageId: courseId }));

      let campaignStrategy = coordinationPlan || null;
      let funnelPhaseMap: Record<string, string> = {};

      if (campaignStrategy) {
         // El plan ya viene armado desde "Estrategia Primero"
         console.log(`[VideoWorker] Usando plan de coordinación inyectado desde la UI.`);
         socials.forEach((social: any) => {
            if (social.funnelPhase) funnelPhaseMap[social.id] = social.funnelPhase;
         });
      } else {
         // Fallback legacy para requests antiguas
         const { planCampaignSocials } = await import('@/ai/flows/plan-campaign-socials');
         socials = await planCampaignSocials({ socials, courseTitle, targetAudience, campaignMission: campaignMission || 'venta', uid, role });
         
         const { generateCoordinationPlan } = await import('@/ai/flows/generate-coordination-plan');
         try {
            console.log(`[VideoWorker] Diseñando estrategia de embudo (Timeline) para ${socials.length} videos... (Precio: $${productData.price})`);
            campaignStrategy = await generateCoordinationPlan({
            campaignTitle: courseTitle,
            strategyType: 'flash_sale',
            durationDays: Math.max(7, socials.length),
            targetAudience,
            availableVideos: socials.map((s: any) => s.id),
            productData
            });
            
            if (campaignStrategy?.timeline) {
            campaignStrategy.timeline.forEach((event: any) => {
               if (event.socialSchedule) {
                  Object.values(event.socialSchedule).forEach((sch: any) => {
                  if (sch.videoName) funnelPhaseMap[sch.videoName] = event.phase;
                  });
               }
            });
            }
         } catch (err) {
            console.error(`[VideoWorker] Error generando Timeline estratégico:`, err);
         }
      }

      const processFullCampaign = async () => {
        try {
          // 3. Actualizar la estructura con los ADNs, colores y el Timeline
          await adminDb.collection('salesPages').doc(campaignId).update({
            'aiContent.socials': socials,
            ...(campaignStrategy ? { campaignStrategy } : {}),
            updatedAt: new Date().toISOString()
          });
          // 4. Generar scripts iterativamente
          for (let i = 0; i < socials.length; i++) {
            const social = socials[i];

            // --- CHECKPOINTING ---
            // Revisamos en DB si la pieza ya fue procesada en una ejecución previa que hizo timeout
            const latestDoc = await adminDb.collection('salesPages').doc(campaignId).get();
            const latestSocials = latestDoc.data()?.aiContent?.socials || [];
            const alreadyGenerated = latestSocials.find((s: any) => s.marketingName === social.marketingName && s.isGenerated === true);
            if (alreadyGenerated) {
               console.log(`[VideoWorker] Saltando pieza ya generada: ${social.marketingName}`);
               socials[i] = alreadyGenerated;
               continue;
            }
            // ---------------------

            // Usar funnelPhase inyectado directamente, o buscar en el mapa, o fallback a Concientización
            const funnelPhase = social.funnelPhase || funnelPhaseMap[social.id] || 'Concientización General';
            console.log(`[VideoWorker] Generando script para ${social.platform} - ${social.marketingName} (Fase: ${funnelPhase})...`);
            
            const directives = `DIRECTIVA ESTRATÉGICA DEL EMBUDO: Este video debe enfocarse estrictamente en la fase psicológica de "${funnelPhase}". Adapta el gancho, el tono y el CTA para cumplir este objetivo.`;

            try {
              const aiContent = await generateVariantContent(
                social,
                directives, // Se inyecta la directiva de la fase
                courseTitle,
                '', // courseDescription
                targetAudience,
                (campaignMission as any) || 'venta',
                '', // landingContext
                undefined, // productType
                uid,
                role
              );
              
              // 3) Generar imágenes para cada escena
              const { generateImage } = await import('@/lib/ai/generate-image');
              if (aiContent.scenes) {
                 for (let scene of aiContent.scenes) {
                    if (scene.media_hint && !scene.imageUrl) {
                       try {
                          const aspectRatio = (social.platform === 'instagram' || social.platform === 'tiktok') ? '9:16' : (social.platform === 'youtube' ? '16:9' : '1:1');
                          const base64Str = await generateImage({
                             prompt: scene.media_hint,
                             keywords: scene.media_hint,
                             courseTitle: courseTitle,
                             contextHint: `Escena de tipo ${scene.segment_label}. Voz: ${scene.voiceover}`,
                             channel: 'video',
                             uid: uid,
                             role: role,
                             aspectRatio: aspectRatio
                          });
                          
                          const base64Data = base64Str.split(',')[1] || base64Str;
                          const { adminStorage } = await import('@/firebase/admin');
                          const bucket = adminStorage.bucket();
                          const fileName = `campaigns/${campaignId}/ai_images/${Date.now()}_${Math.random().toString(36).substring(7)}.png`;
                          const file = bucket.file(fileName);
                          await file.save(Buffer.from(base64Data, 'base64'), { metadata: { contentType: 'image/png' } });
                          const [imageUrl] = await file.getSignedUrl({ action: 'read', expires: '01-01-2050' });
                          
                          scene.imageUrl = imageUrl;
                       } catch(imgErr) {
                          console.warn(`[VideoWorker] Falló auto-generación de imagen:`, imgErr);
                       }
                    }
                 }
              }

              if (aiContent.slides) {
                 for (let slide of aiContent.slides) {
                    if (slide.media_hint && !slide.imageUrl) {
                       try {
                          const aspectRatio = (social.platform === 'instagram' || social.platform === 'tiktok') ? '9:16' : (social.platform === 'youtube' ? '16:9' : '1:1');
                          const base64Str = await generateImage({
                             prompt: slide.media_hint,
                             keywords: slide.media_hint,
                             courseTitle: courseTitle,
                             contextHint: `Placa de tipo ${slide.segment_label}. Voz: ${slide.voiceover}`,
                             channel: 'carousel',
                             uid: uid,
                             role: role,
                             aspectRatio: aspectRatio
                          });
                          
                          const base64Data = base64Str.split(',')[1] || base64Str;
                          const { adminStorage } = await import('@/firebase/admin');
                          const bucket = adminStorage.bucket();
                          const fileName = `campaigns/${campaignId}/ai_images/${Date.now()}_${Math.random().toString(36).substring(7)}.png`;
                          const file = bucket.file(fileName);
                          await file.save(Buffer.from(base64Data, 'base64'), { metadata: { contentType: 'image/png' } });
                          const [imageUrl] = await file.getSignedUrl({ action: 'read', expires: '01-01-2050' });
                          
                          slide.imageUrl = imageUrl;
                       } catch(imgErr) {
                          console.warn(`[VideoWorker] Falló auto-generación de imagen para slide:`, imgErr);
                       }
                    }
                 }
              }

              socials[i] = {  
                 ...social, 
                 ...aiContent, 
                 isGenerated: true,
                 production_notes: {
                   ...(aiContent.production_notes || {}),
                   ...(social.production_notes || {})
                 }
              };
              
              // Actualizar Firestore progresivamente para que la UI lo vea en tiempo real
              await adminDb.collection('salesPages').doc(campaignId).update({
                'aiContent.socials': socials,
                updatedAt: new Date().toISOString()
              });
              
              // Opcional: Encolar la tarea de renderizado de video para este script recién generado
              const { enqueueVideoTask } = await import('@/lib/cloud-tasks');
              await enqueueVideoTask({
                campaignId,
                courseId: campaignId,
                assets: {},
                action: 'generate-video',
                uid,
                role,
                data: {
                  cursoId: campaignId,
                  salesPageId: campaignId,
                  formato: social.production_notes?.aspect_ratio || (social.platform === 'youtube' ? '16:9' : social.platform === 'linkedin' ? '1:1' : '9:16'),
                  avatar: false,
                  engine: 'auto', // O el motor que corresponda
                  marketingName: social.marketingName,
                  campaignTitle: courseTitle,
                  scenes: aiContent.scenes || social.scenes || [],
                  enable_tts: true,
                  audioUrl: social.production_notes?.audio_url,
                  voiceId: social.production_notes?.voice_id,
                  googleToken: googleToken
                }
              });
              
            } catch (err: any) {
              console.error(`[VideoWorker] Error generando script para ${social.marketingName}:`, err.message);
              // Continúa con el siguiente aunque falle uno
            }
          }
          
          console.log(`✅ [VideoWorker] Generación de campaña completada.`);
          // Actualizar el estado de la campaña para que desaparezca "Creando Auto-Campaña..." en la UI
          await adminDb.collection('salesPages').doc(campaignId).update({
            campaignStatus: 'ready_to_publish',
            updatedAt: new Date().toISOString()
          });
        } catch (e) {
          console.error('[VideoWorker] Error fatal procesando campaña completa:', e);
        }
      };

      // Disparar background task y responder inmediatamente
      processFullCampaign();
      return NextResponse.json({ success: true, message: 'Campaña generada y encolada' });
    }

    if (action === 'draft-full-campaign') {
      const { campaignId, targetAudience, campaignMission } = payload;
      console.log(`[VideoWorker] Iniciando procesamiento en background para: ${campaignId}`);

      const processCampaign = async () => {
        try {
          console.log(`[VideoWorker] Redactando BORRADORES para la campaña: ${campaignId}`);
          const { generateVariantContent } = await import('@/ai/flows/generate-variant-content');
          const { adminDb } = await import('@/firebase/admin');
          
          // 0. Recolectar datos
          const spDoc = await adminDb.collection('salesPages').doc(campaignId).get();
          let courseTitle = 'Curso/Producto';
          let productData = { price: 0, productType: 'course' };
          let courseId = '';

          if (spDoc.exists) {
            const spData = spDoc.data() || {};
            courseTitle = spData.title || courseTitle;
            productData.price = spData.price || 0;
            productData.productType = spData.productType || 'course';
            courseId = spData.courseId || spData.productId || campaignId;
          }
          
          const assets = data;
          let socials = assets.socials || [];
          const { coordinationPlan } = payload;
          
          socials = socials.map((s: any) => ({ ...s, id: s.id || Math.random().toString(36).substring(2, 10), salesPageId: courseId }));
          let campaignStrategy = coordinationPlan || null;
          let funnelPhaseMap: Record<string, string> = {};

          if (campaignStrategy) {
             socials.forEach((social: any) => {
                if (social.funnelPhase) funnelPhaseMap[social.id] = social.funnelPhase;
             });
          }

          await adminDb.collection('salesPages').doc(campaignId).update({
            'aiContent.socials': socials,
            ...(campaignStrategy ? { campaignStrategy } : {}),
            updatedAt: new Date().toISOString()
          });

          for (let i = 0; i < socials.length; i++) {
            const social = socials[i];
            const funnelPhase = social.funnelPhase || funnelPhaseMap[social.id] || 'Concientización General';
            console.log(`[VideoWorker] Redactando script para ${social.platform} - ${social.marketingName} (Fase: ${funnelPhase})...`);
            
            const directives = `DIRECTIVA ESTRATÉGICA DEL EMBUDO: Este video debe enfocarse estrictamente en la fase psicológica de "${funnelPhase}". Adapta el gancho, el tono y el CTA para cumplir este objetivo.`;

            try {
              const aiContent = await generateVariantContent(
                social,
                directives,
                courseTitle,
                '',
                targetAudience,
                (campaignMission as any) || 'venta',
                '',
                undefined,
                uid,
                role
              );

              // 3) Generar imágenes para cada escena en borradores
              const { generateImage } = await import('@/lib/ai/generate-image');
              if (aiContent.scenes) {
                 for (let scene of aiContent.scenes) {
                    if (scene.media_hint && !scene.imageUrl) {
                       try {
                          const aspectRatio = (social.platform === 'instagram' || social.platform === 'tiktok') ? '9:16' : (social.platform === 'youtube' ? '16:9' : '1:1');
                          const base64Str = await generateImage({
                             prompt: scene.media_hint,
                             keywords: scene.media_hint,
                             courseTitle: courseTitle,
                             contextHint: `Escena de tipo ${scene.segment_label}. Voz: ${scene.voiceover}`,
                             channel: 'video',
                             uid: uid,
                             role: role,
                             aspectRatio: aspectRatio
                          });
                          
                          const base64Data = base64Str.split(',')[1] || base64Str;
                          const { adminStorage } = await import('@/firebase/admin');
                          const bucket = adminStorage.bucket();
                          const fileName = `campaigns/${campaignId}/ai_images/${Date.now()}_${Math.random().toString(36).substring(7)}.png`;
                          const file = bucket.file(fileName);
                          await file.save(Buffer.from(base64Data, 'base64'), { metadata: { contentType: 'image/png' } });
                          const [imageUrl] = await file.getSignedUrl({ action: 'read', expires: '01-01-2050' });
                          
                          scene.imageUrl = imageUrl;
                       } catch(imgErr) {
                          console.warn(`[VideoWorker] Falló auto-generación de imagen en borrador:`, imgErr);
                       }
                    }
                 }
              }

              if (aiContent.slides) {
                 for (let slide of aiContent.slides) {
                    if (slide.media_hint && !slide.imageUrl) {
                       try {
                          const aspectRatio = (social.platform === 'instagram' || social.platform === 'tiktok') ? '9:16' : (social.platform === 'youtube' ? '16:9' : '1:1');
                          const base64Str = await generateImage({
                             prompt: slide.media_hint,
                             keywords: slide.media_hint,
                             courseTitle: courseTitle,
                             contextHint: `Escena. Voz: ${slide.voiceover}`,
                             channel: 'video',
                             uid: uid,
                             role: role,
                             aspectRatio: aspectRatio
                          });
                          
                          const base64Data = base64Str.split(',')[1] || base64Str;
                          const { adminStorage } = await import('@/firebase/admin');
                          const bucket = adminStorage.bucket();
                          const fileName = `campaigns/${campaignId}/ai_images/${Date.now()}_${Math.random().toString(36).substring(7)}.png`;
                          const file = bucket.file(fileName);
                          await file.save(Buffer.from(base64Data, 'base64'), { metadata: { contentType: 'image/png' } });
                          const [imageUrl] = await file.getSignedUrl({ action: 'read', expires: '01-01-2050' });
                          
                          slide.imageUrl = imageUrl;
                       } catch(imgErr) {
                          console.warn(`[VideoWorker] Falló auto-generación de imagen en borrador slide:`, imgErr);
                       }
                    }
                 }
              }

              socials[i] = {  
                 ...social, 
                 ...aiContent, 
                 isGenerated: true,
                 isDraft: true, // Marcador de borrador
                 status: 'draft', // Estado de borrador
                 production_notes: {
                   ...(aiContent.production_notes || {}),
                   ...(social.production_notes || {})
                 }
              };
              
              await adminDb.collection('salesPages').doc(campaignId).update({
                'aiContent.socials': socials,
                updatedAt: new Date().toISOString()
              });
              
            } catch (err: any) {
              console.error(`[VideoWorker] Error redactando script para ${social.marketingName}:`, err.message);
            }
          }
          
          console.log(`✅ [VideoWorker] Redacción de borradores completada.`);
          await adminDb.collection('salesPages').doc(campaignId).update({
            campaignStatus: 'drafts_ready',
            updatedAt: new Date().toISOString()
          });
        } catch (e) {
          console.error('[VideoWorker] Error fatal procesando borradores:', e);
        }
      };

      // Disparar background task y responder inmediatamente
      processCampaign();
      return NextResponse.json({ success: true, message: 'Borradores generados' });
    }

    if (action === 'generate-video') {
      const repo = new FirestoreVideoJobRepository();
      const useCase = new GenerateVideoUseCase(repo);
      
      console.log(`[VideoWorker] Ejecutando GenerateVideoUseCase para usuario: ${uid}`);
      // Cloud Tasks espera a que la Promesa se resuelva (hasta 30 minutos).
      // Si el UseCase actualiza Firestore internamente, la UI reaccionará en tiempo real.
      const result = await useCase.execute(data, uid, role || 'mentor');
      
      console.log(`✅ [VideoWorker] Tarea completada con éxito. Job ID: ${result.jobId}`);
      return NextResponse.json({ success: true, result });
    }

    // Espacio para futuras acciones pesadas (render-v2, envíos masivos, etc.)
    if (action === 'render-v2') {
      console.log('[VideoWorker] Ejecutando motor render-v2 (Marcador para futura integración)');
      return NextResponse.json({ success: true, message: 'Simulado' });
    }

    return NextResponse.json({ success: false, error: `Acción desconocida: ${action}` }, { status: 400 });

  } catch (error: any) {
    console.error('❌ [VideoWorker] Error catastrófico en background:', error);
    // Cloud Tasks capturará el 500 y reintentará según su política de reintentos
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
