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
      let { campaignId, targetAudience, campaignMission } = payload;
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
      let courseDescription = '';
      let landingContext = '';
      let targetSpId = '';
      let spData: any = {};
      let landingDocData: any = null;

      if (spDoc.exists) {
        spData = spDoc.data() || {};
        courseTitle = spData.title || courseTitle;
        productData.price = spData.price || 0;
        productData.productType = spData.productType || 'course';
        courseId = spData.courseId || spData.productId || spData.salesPageId || campaignId;
        
        // 1. Cargar contexto real de la Landing Page desde salesPages
        targetSpId = spData.salesPageId || spData.courseId || courseId;
        if (targetSpId) {
          try {
            const spRef = await adminDb.collection('salesPages').doc(targetSpId).get();
            if (spRef.exists) {
              landingDocData = spRef.data() || {};
              const sp = landingDocData;
              const isV2 = Array.isArray(sp.content?.sections);
              
              let headline = '';
              let subheadline = '';
              let benefits = '';
              let targetAud = sp.targetAudience || '';
              let sectionsText = '';
              let aboutMentor = '';

              if (isV2) {
                const sections: any[] = sp.content.sections;
                const heroSec = sections.find((s: any) => s.id?.startsWith('hero') || s.type === 'heroVideo');
                headline = heroSec?.title || heroSec?.headline || sp.title || '';
                subheadline = heroSec?.content || heroSec?.subheadline || heroSec?.subtitle || '';

                const benefitsSec = sections.find((s: any) => s.id?.startsWith('benefits') || s.type === 'benefits');
                if (Array.isArray(benefitsSec?.bullets)) {
                  benefits = benefitsSec.bullets.join('; ');
                }

                const mentorSec = sections.find((s: any) => s.id?.startsWith('mentor') || s.type === 'mentorProfile');
                if (mentorSec) {
                  aboutMentor = `${mentorSec.title || ''}: ${mentorSec.content || ''}`.trim();
                }

                sectionsText = sections.map((sec: any) => {
                  const bullets = Array.isArray(sec.bullets || sec.microBullets) ? (sec.bullets || sec.microBullets).join(' | ') : '';
                  const text = sec.content || sec.paragraph || '';
                  return `[${sec.title || sec.headline || sec.id || 'Sección'}]: ${text} ${bullets ? `(Detalles: ${bullets})` : ''}`.trim();
                }).join('\n');
              } else {
                const landing = sp.aiContent?.landings?.[0] || {};
                headline = landing.headline || sp.title || '';
                subheadline = landing.subheadline || '';
                benefits = Array.isArray(landing.benefits) ? landing.benefits.join('; ') : '';
                targetAud = targetAud || landing.targetAudience || '';
                aboutMentor = landing.aboutMentor || '';

                if (Array.isArray(landing.sections)) {
                  sectionsText = landing.sections.map((sec: any) => {
                    const bullets = Array.isArray(sec.microBullets || sec.bullets) ? (sec.microBullets || sec.bullets).join(' | ') : '';
                    return `[${sec.title || 'Sección'}]: ${sec.paragraph || sec.content || ''} ${bullets ? `(Claves: ${bullets})` : ''}`;
                  }).join('\n');
                }
              }

              courseTitle = headline || sp.title || courseTitle;
              courseDescription = `${headline}. ${subheadline}. ${sectionsText}`.trim();
              if (targetAud && (!targetAudience || targetAudience.includes('Público interesado en'))) {
                targetAudience = targetAud;
              }

              landingContext = `
TITULAR DE LA LANDING: "${headline}"
SUBTÍTULO / PROMESA: "${subheadline}"
PÚBLICO OBJETIVO: "${targetAud || targetAudience}"
DOLORES, BLOQUEOS Y PROBLEMAS QUE RESUELVE:
${sectionsText}
BENEFICIOS PRINCIPALES: ${benefits}
ENFOQUE / MENTOR: ${aboutMentor || 'Feliz de Emprender: Expertos en guiar a profesionales holísticos'}
              `.trim();
              
              if (sp.price) productData.price = sp.price;
            }
          } catch (spErr) {
            console.warn('[VideoWorker] Error cargando salesPage para contexto de landing:', spErr);
          }
        }

        // 2. Cargar o complementar con datos del curso vinculado si existe
        const linkedCourseId = landingDocData?.courseId || spData.courseId;
        if (linkedCourseId && linkedCourseId !== targetSpId && linkedCourseId !== 'combo') {
          try {
            const courseDoc = await adminDb.collection('courses').doc(linkedCourseId).get();
            if (courseDoc.exists) {
              const cData = courseDoc.data() || {};
              productData.price = productData.price || cData.price || 0;
              if (!courseDescription) {
                courseDescription = cData.description || '';
              } else if (cData.description) {
                courseDescription = `${cData.description}\n\nDetalles de la Landing:\n${courseDescription}`.trim();
              }
              if (!courseTitle || courseTitle === 'Curso Online') {
                courseTitle = cData.title || courseTitle;
              }
            } else {
              const followupDoc = await adminDb.collection('followups').doc(linkedCourseId).get();
              if (followupDoc.exists) {
                const fData = followupDoc.data() || {};
                productData.price = productData.price || fData.price || 0;
                if (!courseDescription) {
                  courseDescription = fData.goal || fData.description || '';
                }
              }
            }
          } catch (cErr) {
            console.warn('[VideoWorker] Error cargando curso vinculado:', cErr);
          }
        }
      }
      
      const assets = data || {};
      let socials = assets.socials || [];
      const { coordinationPlan } = payload;
      
      socials = socials.map((s: any) => ({ ...s, id: s.id || Math.random().toString(36).substring(2, 10), salesPageId: targetSpId || courseId }));

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
            const campaignLanguage = payload.language || spData.language || landingDocData?.language || social.language || 'es-AR';
            console.log(`[VideoWorker] Redactando script para ${social.platform} - ${social.marketingName} (Fase: ${funnelPhase}, Idioma: ${campaignLanguage})...`);
            
            const directives = `DIRECTIVA ESTRATEGICA DEL EMBUDO: Este video debe enfocarse estrictamente en la fase psicologica de "${funnelPhase}". Adapta el gancho, el tono y el CTA para cumplir este objetivo.`;

            try {
              const aiContent = await generateVariantContent(
                social,
                directives,
                courseTitle,
                courseDescription,
                targetAudience,
                (campaignMission as any) || 'venta',
                landingContext,
                undefined,
                uid,
                role,
                campaignLanguage
              );

              // Generacion automatica de imagenes con IA (si autoGenerateImages es true)
              if (autoGenerateImages) {
                const { generateImage } = await import('@/lib/ai/generate-image');
                const bucket = adminStorage.bucket();

                // 1. Escenas de video
                const pieceAdnId = social.adnId || social.production_notes?.adnId;
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
                          aspectRatio,
                          adnId: pieceAdnId
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
                          aspectRatio,
                          adnId: pieceAdnId
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
                duration: Math.max(Number(sc.duration) || 4, 2.5),
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
