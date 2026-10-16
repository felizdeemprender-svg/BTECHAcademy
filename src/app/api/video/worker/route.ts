import { NextRequest, NextResponse } from 'next/server';
import { GenerateVideoUseCase } from '@/domain/video/use-cases/generate-video-use-case';
import { FirestoreVideoJobRepository } from '@/data/firestore/video-job-repo';

export const maxDuration = 300;

/**
 * POST /api/video/worker
 * Endpoint protegido para Google Cloud Tasks / Invocación Directa Asíncrona.
 * Procesa en background la generación de piezas de campaña, imágenes y video.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Autenticación M2M (Machine to Machine)
    const authHeader = req.headers.get('Authorization');
    const secret = process.env.WORKER_SECRET || 'fastoria-video-worker-local-secret';
    
    if (authHeader !== `Bearer ${secret}`) {
      console.error('[VideoWorker] Intento de acceso no autorizado.');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Extraer Payload
    const payload = await req.json();
    console.log('[VideoWorker] Iniciando tarea en background:', JSON.stringify(payload).substring(0, 200) + '...');

    const { action, data, uid, role } = payload;
    const googleToken = payload.googleToken || data?.googleToken;

    if (!action) {
      return NextResponse.json({ error: 'Falta parametro action' }, { status: 400 });
    }

    // 3. Orquestador Unificado de Campañas
    if (action === 'generate-full-campaign' || action === 'draft-full-campaign' || action === 'process-campaign') {
      const { campaignId, targetAudience, campaignMission } = payload;
      // Parámetro unificado: por defecto genera imágenes, salvo que explícitamente se indique false
      const autoGenerateImages = payload.autoGenerateImages !== false && data?.autoGenerateImages !== false;
      console.log(`[VideoWorker] Procesando campana: ${campaignId} (Imagenes automaticas: ${autoGenerateImages ? 'SI' : 'NO'})`);
      
      const { generateVariantContent } = await import('@/ai/flows/generate-variant-content');
      const { adminDb, adminStorage, saveBufferAndGetPublicUrl } = await import('@/firebase/admin');
      
      // 0. Recolectar datos del producto/campaña
      const spDoc = await adminDb.collection('campaigns').doc(campaignId).get();
      let courseTitle = 'Curso/Producto';
      let productData = { price: 0, productType: 'course' };
      let courseId = '';

      if (spDoc.exists) {
        const spData = spDoc.data() || {};
        courseTitle = spData.title || courseTitle;
        productData.price = spData.price || 0;
        productData.productType = spData.productType || 'course';
        courseId = spData.courseId || spData.productId || campaignId;
        
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
      
      const assets = data || {};
      let socials = assets.socials || [];
      const { coordinationPlan } = payload;
      
      socials = socials.map((s: any) => ({ ...s, id: s.id || Math.random().toString(36).substring(2, 10), salesPageId: courseId }));

      let campaignStrategy = coordinationPlan || null;
      let funnelPhaseMap: Record<string, string> = {};

      if (campaignStrategy) {
        socials.forEach((social: any) => {
          if (social.funnelPhase) funnelPhaseMap[social.id] = social.funnelPhase;
        });
      } else {
        const { planCampaignSocials } = await import('@/ai/flows/plan-campaign-socials');
        socials = await planCampaignSocials({ socials, courseTitle, targetAudience, campaignMission: campaignMission || 'venta', uid, role });
        
        const { generateCoordinationPlan } = await import('@/ai/flows/generate-coordination-plan');
        try {
          console.log(`[VideoWorker] Disenando estrategia de embudo (Timeline) para ${socials.length} videos...`);
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
          console.error('[VideoWorker] Error generando Timeline estrategico:', err);
        }
      }

      const processCampaign = async () => {
        try {
          await adminDb.collection('campaigns').doc(campaignId).update({
            'videoSkeletons': socials,
            ...(campaignStrategy ? { campaignStrategy } : {}),
            updatedAt: new Date().toISOString()
          });

          for (let i = 0; i < socials.length; i++) {
            const social = socials[i];

            // Checkpointing: verificar si la pieza ya fue procesada previamente
            const latestDoc = await adminDb.collection('campaigns').doc(campaignId).get();
            const latestSocials = latestDoc.data()?.videoSkeletons || [];
            const alreadyGenerated = latestSocials.find((s: any) => s.marketingName === social.marketingName && s.isGenerated === true);
            
            // Si ya está generada y además cumple con la condición de imágenes requerida, saltar
            if (alreadyGenerated && (!autoGenerateImages || (alreadyGenerated.scenes || alreadyGenerated.slides || []).some((sc: any) => !!sc.imageUrl))) {
              console.log(`[VideoWorker] Saltando pieza ya generada: ${social.marketingName}`);
              socials[i] = alreadyGenerated;
              continue;
            }

            const funnelPhase = social.funnelPhase || funnelPhaseMap[social.id] || 'Concientizacion General';
            console.log(`[VideoWorker] Redactando script para ${social.platform} - ${social.marketingName} (Fase: ${funnelPhase})...`);
            
            const directives = `DIRECTIVA ESTRATEGICA DEL EMBUDO: Este video debe enfocarse estrictamente en la fase psicologica de "${funnelPhase}". Adapta el gancho, el tono y el CTA para cumplir este objetivo.`;

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

              // Generacion automatica de imagenes con IA (si autoGenerateImages es true)
              if (autoGenerateImages) {
                const { generateImage } = await import('@/lib/ai/generate-image');
                const bucket = adminStorage.bucket();

                // 1. Escenas de video
                if (aiContent.scenes) {
                  for (let scene of aiContent.scenes) {
                    if (scene.media_hint && !scene.imageUrl) {
                      try {
                        const aspectRatio = (social.platform === 'instagram' || social.platform === 'tiktok') ? '9:16' : (social.platform === 'youtube' ? '16:9' : '1:1');
                        const base64Str = await generateImage({
                          prompt: scene.media_hint,
                          keywords: scene.media_hint,
                          courseTitle,
                          contextHint: `Escena de tipo ${scene.segment_label}. Voz: ${scene.voiceover}`,
                          channel: 'video',
                          uid,
                          role,
                          aspectRatio
                        });
                        
                        const base64Data = base64Str.split(',')[1] || base64Str;
                        const fileName = `campaigns/${campaignId}/ai_images/${Date.now()}_${Math.random().toString(36).substring(7)}.png`;
                        const imageUrl = await saveBufferAndGetPublicUrl(bucket, fileName, Buffer.from(base64Data, 'base64'), 'image/png');
                        scene.imageUrl = imageUrl;
                      } catch (imgErr: any) {
                        console.warn('[VideoWorker] Fallo auto-generacion de imagen en escena:', imgErr?.message || imgErr);
                      }
                    }
                  }
                }

                // 2. Placas de carrusel
                if (aiContent.slides) {
                  for (let slide of aiContent.slides) {
                    if (slide.media_hint && !slide.imageUrl) {
                      try {
                        const aspectRatio = (social.platform === 'instagram' || social.platform === 'tiktok') ? '9:16' : (social.platform === 'youtube' ? '16:9' : '1:1');
                        const base64Str = await generateImage({
                          prompt: slide.media_hint,
                          keywords: slide.media_hint,
                          courseTitle,
                          contextHint: `Placa de tipo ${slide.segment_label}. Voz: ${slide.voiceover}`,
                          channel: 'carousel',
                          uid,
                          role,
                          aspectRatio
                        });
                        
                        const base64Data = base64Str.split(',')[1] || base64Str;
                        const fileName = `campaigns/${campaignId}/ai_images/${Date.now()}_${Math.random().toString(36).substring(7)}.png`;
                        const imageUrl = await saveBufferAndGetPublicUrl(bucket, fileName, Buffer.from(base64Data, 'base64'), 'image/png');
                        slide.imageUrl = imageUrl;
                      } catch (imgErr: any) {
                        console.warn('[VideoWorker] Fallo auto-generacion de imagen en slide:', imgErr?.message || imgErr);
                      }
                    }
                  }
                }
              }

              const rawScenes = (aiContent.scenes && aiContent.scenes.length > 0) ? aiContent.scenes : (aiContent.slides || []);
              const mappedScenes = rawScenes.map((sc: any) => ({
                segment: sc.segment_label || sc.segment || 'VALOR',
                segment_label: sc.segment_label || sc.segment || 'VALOR',
                title: sc.title || '',
                text: sc.text || '',
                subtitle: sc.subtitle || '',
                watermark: sc.watermark || '',
                voiceover: sc.voiceover || '',
                duration: Math.max(Number(sc.duration) || 10, 10),
                imageUrl: sc.imageUrl || '',
                media_hint: sc.media_hint || '',
                production_notes: sc.production_notes || '',
                subject_action: sc.subject_action || '',
                camera_movement: sc.camera_movement || '',
                framing: sc.framing || '',
                lighting: sc.lighting || ''
              }));

              socials[i] = {  
                ...social, 
                ...aiContent, 
                scenes: mappedScenes,
                slides: mappedScenes,
                isGenerated: true,
                isDraft: true,
                status: 'draft',
                production_notes: {
                  ...(aiContent.production_notes || {}),
                  ...(social.production_notes || {})
                }
              };
              
              await adminDb.collection('campaigns').doc(campaignId).update({
                'aiContent.socials': socials,
                'videoSkeletons': socials,
                updatedAt: new Date().toISOString()
              });
              
            } catch (err: any) {
              console.error(`[VideoWorker] Error procesando ${social.marketingName}:`, err.message);
            }
          }
          
          console.log(`[VideoWorker] Procesamiento de campana completado para ${campaignId}`);
          await adminDb.collection('campaigns').doc(campaignId).update({
            campaignStatus: 'drafts_ready',
            updatedAt: new Date().toISOString()
          });
        } catch (e) {
          console.error('[VideoWorker] Error fatal procesando campana:', e);
        }
      };

      await processCampaign();
      return NextResponse.json({ success: true, message: 'Campana procesada exitosamente' });
    }

    if (action === 'generate-video') {
      const repo = new FirestoreVideoJobRepository();
      const useCase = new GenerateVideoUseCase(repo);
      
      console.log(`[VideoWorker] Ejecutando GenerateVideoUseCase para usuario: ${uid}`);
      const result = await useCase.execute(data, uid, role || 'mentor');
      
      console.log(`[VideoWorker] Tarea completada con exito. Job ID: ${result.jobId}`);
      return NextResponse.json({ success: true, result });
    }

    if (action === 'render-v2') {
      const jobId = data?.jobId || payload?.jobId;
      const renderRequest = data?.renderRequest || payload?.renderRequest || data;
      console.log(`[VideoWorker] Ejecutando render-v2 con FFmpeg para jobId: ${jobId}`);
      const { runRenderJob } = await import('@/lib/video/render-job');
      await runRenderJob(jobId, renderRequest);
      console.log(`[VideoWorker] Render-v2 finalizado con exito para jobId: ${jobId}`);
      return NextResponse.json({ success: true, jobId });
    }

    return NextResponse.json({ success: false, error: `Accion desconocida: ${action}` }, { status: 400 });

  } catch (error: any) {
    console.error('[VideoWorker] Error catastrofico en background:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
