/**
 * API — Handler del scheduler de campañas (F1.2).
 * El scheduler NO reusa `execute-campaign` (disparo MANUAL del día actual
 * con feedbacks "[MANUAL ...]", horarios por defecto y error si no hay
 * acciones): forzarlo cambiaría respuestas HTTP, feedbacks, horarios por
 * plataforma e idempotencia. Se mueve la lógica legacy TAL CUAL fuera del
 * route, operando vía gateway (queryByTwoFields con fallback). La auth
 * admin (`verifyAdmin`) queda en el borde del route, igual que hoy.
 */
import { NextResponse } from 'next/server';

import type { FirestoreGateway } from '@/data/firestore/gateway';

// HELPER: Convert "HH:MM" into absolute minutes (igual que el legacy).
const getMinutes = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

/** GET /api/campaigns/scheduler. Respuestas legacy exactas. */
export async function handleRunScheduler(
  gateway: FirestoreGateway,
  now?: Date,
): Promise<NextResponse> {
  try {
    const today = now ?? new Date();

    // Server time calculation (Minutes from midnight)
    const nowMin = today.getHours() * 60 + today.getMinutes();
    const todayStr = today.toISOString().split('T')[0];

    console.log(`[Scheduler] Scanning campaigns at ${today.toISOString()} (${nowMin} minutes)`);

    // 1. Fetch active campaigns with autoPilot enabled
    const snap = gateway.queryByTwoFields
      ? await gateway.queryByTwoFields('campaigns', 'isActive', true, 'autoPilot', true)
      : await gateway.queryByField('campaigns', 'isActive', true);
    const docs = gateway.queryByTwoFields
      ? snap.docs
      : snap.docs.filter((d) => d.data()?.autoPilot === true);

    if (docs.length === 0) {
      return NextResponse.json({ message: 'No active autopilot campaigns found.' });
    }

    const dispatches: unknown[] = [];
    const debugStats = { skippedFutureTime: 0, skippedAlreadyRun: 0, processedEvents: 0 };

    // 2. Loop through campaigns
    for (const d of docs) {
      const camp = { id: d.id, ...(d.data() ?? {}) } as {
        id: string;
        [key: string]: unknown;
      } & {
        startDate?: unknown;
        createdAt?: { toDate?: () => Date };
        strategy?: { timeline?: { day: number; action: unknown; phase: unknown; variantIndex: unknown; channels?: unknown; socialSchedule?: Record<string, { time?: string; videoName?: string }> }[] };
        mentorId: string;
        title: unknown;
        executionLogs?: Record<string, unknown>[];
      };

      // Calculate relative campaign day (1-indexed) safely avoiding timezone drift
      const startDateStr = camp.startDate 
        ? (typeof camp.startDate === 'string' ? camp.startDate : (camp.startDate as any).toISOString())
        : (camp.createdAt?.toDate ? camp.createdAt.toDate().toISOString() : today.toISOString());
      
      const datePart = startDateStr.split('T')[0];
      const [sYear, sMonth, sDay] = datePart.split('-').map(Number);
      
      const startClean = new Date(sYear, sMonth - 1, sDay);
      const todayClean = new Date(today.getFullYear(), today.getMonth(), today.getDate());

      const diffTime = todayClean.getTime() - startClean.getTime();
      const currentDay = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

      // Skip if the campaign relative day is outside bounds
      const timeline = camp.strategy?.timeline || [];
      const maxDays = timeline.length > 0 ? Math.max(...timeline.map((e) => e.day)) : 0;

      if (currentDay < 1 || currentDay > maxDays) {
        console.log(
          `[Scheduler] Campaign ${camp.id} ("${camp.title}") is on relative day ${currentDay} (Out of timeline bounds 1-${maxDays})`,
        );
        continue;
      }

      // Fetch expected events in timeline (catch-up logic: day <= currentDay)
      const expectedEvents = timeline.filter((e) => e.day <= currentDay);
      if (expectedEvents.length === 0) continue;

      // Fetch mentor's marketing credentials to identify sandbox/production modes and keys
      const mentorSnap = await gateway.getDoc('users', camp.mentorId);
      const credentials = ((mentorSnap?.data()?.marketingCredentials ?? {}) as Record<
        string,
        { mode?: string; apiKey?: string } | undefined
      >);

      // 3. Process each expected event
      for (const event of expectedEvents) {
        const channels = (event.channels as string[]) || [];

        for (const channel of channels) {
          if (channel === 'Social') {
            // Social channel has multiple potential platforms with their own schedules
            const activePlatforms = ['instagram', 'tiktok', 'linkedin', 'twitter', 'x', 'youtube'];

            for (const plat of activePlatforms) {
              const platformSchedulesRaw = event.socialSchedule?.[plat];
              if (!platformSchedulesRaw) continue;
              
              const platformSchedules = Array.isArray(platformSchedulesRaw) ? platformSchedulesRaw : [platformSchedulesRaw];

              for (const currentSched of platformSchedules) {
                // Check if already executed
                const alreadyRun = (camp.executionLogs || []).some(
                  (log) =>
                    log.day === event.day &&
                    log.channel === 'Social' &&
                    log.platform === plat &&
                    log.videoName === currentSched.videoName &&
                    log.time === currentSched.time &&
                    log.format === currentSched.format &&
                    log.status === 'success',
                );

                if (alreadyRun) {
                  debugStats.skippedAlreadyRun++;
                  continue;
                }

                const schedTimeMin = getMinutes(currentSched.time || '18:00');

                if (event.day < currentDay || nowMin >= schedTimeMin) {
                  debugStats.processedEvents++;
                  const motorId =
                    plat === 'instagram'
                      ? 'meta_social'
                      : plat === 'tiktok'
                        ? 'tiktok'
                        : plat === 'linkedin'
                          ? 'linkedin'
                          : 'twitter';
                  const motorCreds = credentials[motorId] || {};
                  const mode = motorCreds.mode || 'sandbox';

                  // Rich simulated responses depending on Sandbox or Production
                  let status = 'success';
                  let feedback = '';
                  const responseId = `${plat}_sch_${Math.floor(Math.random() * 10000000)}`;

                  if (mode === 'sandbox') {
                    if (plat === 'instagram') {
                      feedback =
                        '💡 [SANDBOX] Meta Unified Graph API: El video fue cargado con éxito en el sandbox de Reels. Simulación de retención estimada del 82% en los primeros 10 minutos. Formato MP4 validado.';
                    } else if (plat === 'tiktok') {
                      feedback =
                        '💡 [SANDBOX] TikTok Content API: Clip publicado con éxito en feed de pruebas. El algoritmo del sandbox reporta respuesta óptima de reproducción automática continua.';
                    } else if (plat === 'linkedin') {
                      feedback =
                        '💡 [SANDBOX] LinkedIn Professional: Post de texto y video corporativo indexado en la red B2B de pruebas. Autoridad temática validada.';
                    } else {
                      feedback =
                        '💡 [SANDBOX] X (Twitter) Engine: Tweet publicado con éxito en Sandbox. Hilo enganchado con la landing del curso.';
                    }
                  } else {
                    // Production Simulation or live execution checking keys
                    if (!motorCreds.apiKey || motorCreds.apiKey.length < 5) {
                      status = 'failed';
                      feedback = `⚠️ [PRODUCCIÓN] Error de autenticación: La API Key provista para el motor ${plat.toUpperCase()} está vacía o es inválida en producción. Emisión cancelada.`;
                    } else {
                      if (plat === 'instagram') {
                         // 1. Encontrar el assetId y URL de video
                         let videoUrl;
                         let finalCaption = event.action as string;
                         
                         if (camp.salesPageId) {
                           try {
                             const spDoc = await gateway.getDoc('salesPages', camp.salesPageId as string);
                             const fallbackSocials = (spDoc?.data()?.aiContent as any)?.socials || [];
                             
                             let matchingSocial = fallbackSocials.find((s: any) => 
                                s.platform === plat && 
                                s.marketingName === currentSched.videoName &&
                                (currentSched.format ? s.format === currentSched.format : true)
                             );
                             if (!matchingSocial) {
                                matchingSocial = fallbackSocials.find((s: any) => 
                                  s.platform === plat && 
                                  s.marketingName === currentSched.videoName
                                );
                             }
                             if (!matchingSocial) {
                                matchingSocial = fallbackSocials.find((s: any) => 
                                  s.platform === plat && 
                                  s.marketingName?.includes(`Día ${event.day}`) &&
                                  (currentSched.format ? s.format === currentSched.format : true)
                                );
                             }
                             
                             if (matchingSocial) {
                               videoUrl = matchingSocial.production_notes?.video_url || matchingSocial.production_notes?.video_download_url;
                               if (matchingSocial.caption) finalCaption = matchingSocial.caption;
                             }
                           } catch (e) {
                             console.error("[Scheduler] Error leyendo salesPage", e);
                           }
                         }

                         if (!videoUrl) {
                            status = 'failed';
                            feedback = `⚠️ [PRODUCCIÓN] Falló el cron: No se encontró URL de video para ${currentSched.videoName}.`;
                          } else {
                            const processingLog = {
                              timestamp: new Date().toISOString(),
                              day: event.day,
                              channel: 'Social',
                              platform: plat,
                              action: event.action,
                              phase: event.phase,
                              variantIndex: event.variantIndex,
                              videoName: currentSched.videoName || `Video ${event.day}`,
                              format: currentSched.format,
                              time: currentSched.time,
                              status: 'processing',
                              mode,
                              provider: plat.toUpperCase(),
                              feedback: '⏱️ [PRODUCCIÓN] Mandamos a publicar. Procesando en Meta...',
                              responseId,
                              protocolVerified: true,
                            };
                            camp.executionLogs = [...(camp.executionLogs || []), processingLog];
                            await gateway.updateDoc('campaigns', camp.id, { executionLogs: camp.executionLogs });

                            const { MetaGraphPublisher } = await import('@/infrastructure/social/instagram-publisher');
                            const publisher = new MetaGraphPublisher();
                            const pubResult = await publisher.publish({
                              platform: plat,
                              caption: finalCaption,
                              videoUrl,
                              format: currentSched.format || 'reel',
                              credentials: { 
                                 apiKey: motorCreds.apiKey,
                                 accountId: (motorCreds as any).accountId || ''
                              }
                            });

                            camp.executionLogs = camp.executionLogs.filter((l) => l !== processingLog);

                            if (!pubResult.ok) {
                              status = 'failed';
                              feedback = `⚠️ [PRODUCCIÓN] Fallo en API: ${pubResult.error.message}`;
                            } else {
                              feedback = `🚀 [PRODUCCIÓN] ¡Publicación Diaria Automática (CRON) Exitosa! Link: ${pubResult.value.url ?? pubResult.value.postId}`;
                            }
                         }
                      } else {
                         feedback = `🚀 [PRODUCCIÓN] ¡Emisión Automática (CRON) Exitosa! El motor ${plat.toUpperCase()} disparó la acción por API hacia ${plat}. ID: ${responseId}`;
                      }
                    }
                  }

                  const newLog = {
                    timestamp: new Date().toISOString(),
                    day: event.day,
                    channel: 'Social',
                    platform: plat,
                    action: event.action,
                    phase: event.phase,
                    variantIndex: event.variantIndex,
                    videoName: currentSched.videoName || `Video ${event.day}`,
                    format: currentSched.format,
                    time: currentSched.time,
                    status,
                    mode,
                    provider: plat.toUpperCase(),
                    feedback,
                    responseId,
                    protocolVerified: true,
                  };

                  // Append log to campaign
                  camp.executionLogs = [...(camp.executionLogs || []), newLog];
                  dispatches.push({ campaign: camp.title, channel: 'Social', platform: plat, status, feedback });
                } else {
                  debugStats.skippedFutureTime++;
                }
              }
            }
          } else {
            // General Channels: Email only (Ads is removed)
            if (channel !== 'Email') continue;

            const alreadyRun = (camp.executionLogs || []).some(
              (log) => log.day === event.day && log.channel === channel && log.status === 'success',
            );

            if (alreadyRun) continue;

            const defaultTime = '09:00';
            const schedTimeMin = getMinutes(defaultTime);

            if (event.day < currentDay || nowMin >= schedTimeMin) {
              const motorId = 'sendgrid';
              const motorCreds = credentials[motorId] || {};
              const mode = motorCreds.mode || 'sandbox';

              let status = 'success';
              let feedback = '';
              const responseId = `${channel.toLowerCase()}_sch_${Math.floor(Math.random() * 10000000)}`;

              if (mode === 'sandbox') {
                feedback =
                  '💡 [SANDBOX] SendGrid Engine: Plantilla de correo del pack multimedia enviada exitosamente a la lista de pruebas de mentoría. Tasa de entregabilidad simulada del 99.7%.';
              } else {
                if (!motorCreds.apiKey || motorCreds.apiKey.length < 5) {
                  status = 'failed';
                  feedback = `⚠️ [PRODUCCIÓN] Error de credenciales: API Key de SendGrid no configurada o inválida. Emisión cancelada.`;
                } else {
                  feedback = `🚀 [PRODUCCIÓN] Emisión Real Exitosa. Conector de SendGrid disparó las peticiones automáticas de la campaña. ID: ${responseId}`;
                }
              }

              const newLog = {
                timestamp: new Date().toISOString(),
                day: event.day,
                channel,
                action: event.action,
                phase: event.phase,
                variantIndex: event.variantIndex,
                time: defaultTime,
                status,
                mode,
                provider: 'SendGrid',
                feedback,
                responseId,
                protocolVerified: true,
              };

              camp.executionLogs = [...(camp.executionLogs || []), newLog];
              dispatches.push({ campaign: camp.title, channel, status, feedback });
            }
          }
        }
      }

      // 4. Update the campaign document in Firestore with the new execution logs
      await gateway.updateDoc('campaigns', camp.id, {
        executionLogs: camp.executionLogs || [],
        updatedAt: new Date(),
      });
    }

    return NextResponse.json({
      status: 'completed',
      processedAt: today.toISOString(),
      dispatchesExecuted: dispatches.length,
      debugStats: `Analizados: ${debugStats.processedEvents}. Ignorados (ya publicados): ${debugStats.skippedAlreadyRun}. Ignorados (hora futura): ${debugStats.skippedFutureTime}.`,
      details: dispatches,
    });
  } catch (error: unknown) {
    console.error('[Scheduler] Critical execution error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Failed to process campaign scheduling tasks.', details: message },
      { status: 500 },
    );
  }
}
