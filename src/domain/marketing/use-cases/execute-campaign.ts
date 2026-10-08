/**
 * Marketing — Caso de uso: disparo manual del día actual.
 * Replica el dispatch de execution/page.tsx: verifica credenciales
 * de producción, genera un log por canal (Social expande a las
 * 5 plataformas) y los agrega con arrayUnion. `responseId`
 * determinista (canal+día+índice+timestamp) en vez de random.
 */
import { err, ok, type Result } from '@/domain/shared/result';
import {
  notFound,
  unavailable,
  validationError,
  type DomainError,
} from '@/domain/shared/errors';

import {
  campaignCurrentDay,
  parseCampaignDate,
  todayActions,
} from '../coordination-plan';
import type { TimelineEvent } from '../timeline';
import {
  ExecutionLogSchema,
  type ExecutionLog,
  type ExecutionMode,
} from '../execution-log';
import type { CampaignRepository } from '../campaign-repository';

export interface MotorCredentials {
  readonly mode?: string;
  readonly apiKey?: string;
}

export type CredentialsMap = Record<string, MotorCredentials | undefined>;

export interface ExecuteCampaignInput {
  readonly id: string;
  readonly credentials: CredentialsMap;
  readonly now?: Date;
  readonly fallbackSocials?: any[];
  readonly forceDay?: number;
}

export interface ExecuteCampaignResult {
  readonly logsAppended: number;
  readonly currentDay: number;
}

const SOCIAL_PLATFORMS = ['instagram', 'tiktok', 'linkedin', 'twitter', 'x', 'youtube'] as const;

function motorIdFor(channel: string): string {
  if (channel === 'Email') return 'sendgrid';
  return 'meta_social';
}

function modeFor(credentials: CredentialsMap, motorId: string): ExecutionMode {
  return credentials[motorId]?.mode === 'production' ? 'production' : 'sandbox';
}

/** Canales que exigen API key por estar en modo producción. */
export function missingProductionCredentials(
  channels: readonly string[],
  credentials: CredentialsMap,
): string[] {
  return channels.filter((ch) => {
    const creds = credentials[motorIdFor(ch)];
    return creds?.mode === 'production' && !creds.apiKey;
  });
}

function socialFeedback(platform: string, mode: ExecutionMode): string {
  if (mode === 'sandbox') {
    if (platform === 'instagram') {
      return '💡 [MANUAL SANDBOX] Meta Unified Graph API: Publicación manual simulada en Reels. Formato MP4 validado.';
    }
    if (platform === 'tiktok') {
      return '💡 [MANUAL SANDBOX] TikTok Content API: Clip manual simulado con éxito en feed de pruebas.';
    }
    if (platform === 'linkedin') {
      return '💡 [MANUAL SANDBOX] LinkedIn Professional: Post manual indexado en la red B2B de pruebas.';
    }
    return '💡 [MANUAL SANDBOX] X (Twitter) Engine: Tweet manual publicado en sandbox.';
  }
  return `🚀 [MANUAL PRODUCCIÓN] ¡Emisión Real manual disparada en ${platform.toUpperCase()}!`;
}

function channelFeedback(channel: string, mode: ExecutionMode): string {
  if (mode === 'sandbox') {
    return '💡 [MANUAL SANDBOX] SendGrid SMTP: Correo manual simulado enviado exitosamente a la lista de pruebas.';
  }
  return `🚀 [MANUAL PRODUCCIÓN] Emisión Real manual disparada en SendGrid!`;
}

/** Expansión pura de acciones de hoy → logs (sin IO). Testeable aislada. */
export function buildDispatchLogs(
  today: readonly TimelineEvent[],
  currentDay: number,
  credentials: CredentialsMap,
  timestampIso: string,
): ExecutionLog[] {
  const logs: ExecutionLog[] = [];
  today.forEach((action, actionIdx) => {
    for (const channel of action.channels) {
      const mode = modeFor(credentials, motorIdFor(channel));
      if (channel === 'Social') {
        const targetPlatforms = action.socialSchedule && Object.keys(action.socialSchedule).length > 0
          ? Object.keys(action.socialSchedule)
          : SOCIAL_PLATFORMS;

        targetPlatforms.forEach((platform, platIdx) => {
          const schedules = action.socialSchedule?.[platform] ?? [{
            time: '18:00',
            videoName: `Video ${currentDay}`,
            format: 'reel',
            narrativeStage: 'VALOR'
          }];

          schedules.forEach((sched, itemIdx) => {
            const parsed = ExecutionLogSchema.parse({
              timestamp: timestampIso,
              day: currentDay,
              channel: 'Social',
              platform,
              action: action.action,
              phase: action.phase,
              variantIndex: action.variantIndex,
              time: sched.time,
              videoName: sched.videoName,
              format: sched.format,
              narrativeStage: (sched as any).narrativeStage,
              status: 'success',
              mode,
              provider: platform.toUpperCase(),
              feedback: socialFeedback(platform, mode),
              responseId: `${platform}_${currentDay}_${actionIdx}_${platIdx}_${itemIdx}`,
              protocolVerified: true,
            });
            logs.push(parsed);
          });
        });
      } else if (channel === 'Email') {
        const parsed = ExecutionLogSchema.parse({
          timestamp: timestampIso,
          day: currentDay,
          channel,
          action: action.action,
          phase: action.phase,
          variantIndex: action.variantIndex,
          time: '09:00',
          status: 'success',
          mode,
          provider: 'SendGrid',
          feedback: channelFeedback(channel, mode),
          responseId: `${channel.toLowerCase()}_${currentDay}_${actionIdx}`,
          protocolVerified: true,
        });
        logs.push(parsed);
      }
    }
  });
  return logs;
}

export async function executeCampaignStep(
  repo: CampaignRepository,
  input: ExecuteCampaignInput,
  publisher?: import('../social-publisher').SocialPublisher
): Promise<Result<ExecuteCampaignResult, DomainError>> {
  if (input.id.trim() === '') return err(validationError('id vacío'));
  try {
    const campaign = await repo.findById(input.id);
    if (!campaign) return err(notFound(`Campaña ${input.id} no encontrada`));
    
    if (campaign.productionStatus !== 'ready_to_publish' && campaign.productionStatus !== 'sealed') {
      return err(validationError(`Las piezas multimedia de la campaña no han sido aprobadas (Estado: ${campaign.productionStatus})`));
    }

    const now = input.now ?? new Date();
    const currentDay = input.forceDay !== undefined ? input.forceDay : campaignCurrentDay(parseCampaignDate(campaign.startDate, now), now);
    const today = todayActions(campaign.strategy.timeline, currentDay);
    if (today.length === 0) {
      return err(validationError(`Sin acciones para el día ${currentDay}`));
    }

    const channels = Array.from(new Set(today.flatMap((a) => a.channels)));
    const missing = missingProductionCredentials(channels, input.credentials);
    if (missing.length > 0) {
      return err(
        validationError(`Faltan API keys de producción: ${missing.join(', ')}`, { channels: missing }),
      );
    }

    // 1. Logs simulados por defecto
    const logs = buildDispatchLogs(today, currentDay, input.credentials, now.toISOString());

    // 2. Si hay un publicador inyectado, ejecutar I/O real para los logs en modo "production"
    if (publisher) {
      for (const log of logs) {
        if (log.mode === 'production' && log.channel === 'Social' && log.platform) {
          // Buscamos la acción original para extraer el assetId
          const action = today.find(a => a.action === log.action);
          const schedules = action?.socialSchedule?.[log.platform];
          const sched = schedules?.find(s => s.time === log.time && s.videoName === log.videoName);
          const assetId = sched?.assetId;
          let videoUrl = assetId ? campaign.generatedAssets?.[assetId] : undefined;

          // Heurística de fallback para extraer Caption y Video desde la mesa de trabajo
          let finalCaption = log.action;
          if (input.fallbackSocials) {
            let matchingSocial = input.fallbackSocials.find(s => 
               s.platform === log.platform && 
               s.marketingName === log.videoName &&
               (log.format ? s.format === log.format : true)
            );

            if (!matchingSocial) {
              matchingSocial = input.fallbackSocials.find(s => 
                 s.platform === log.platform && 
                 s.marketingName === log.videoName
              );
            }
            
            if (!matchingSocial) {
              matchingSocial = input.fallbackSocials.find(s => 
                 s.platform === log.platform && 
                 s.marketingName?.includes(`Día ${currentDay}`) &&
                 (log.format ? s.format === log.format : true)
              );
            }

            if (matchingSocial) {
              if (!videoUrl) {
                videoUrl = matchingSocial.production_notes?.video_url || matchingSocial.production_notes?.video_download_url;
              }
              if (matchingSocial.caption) {
                finalCaption = matchingSocial.caption;
              }
            }
          }

          const pubResult = await publisher.publish({
            platform: log.platform,
            caption: finalCaption,
            videoUrl,
            format: log.format,
            credentials: { 
               apiKey: input.credentials[motorIdFor('Social')]?.apiKey ?? '',
               accountId: (input.credentials[motorIdFor('Social')] as any)?.accountId ?? ''
            }
          });

          if (!pubResult.ok) {
            log.status = 'error';
            log.feedback = pubResult.error.message;
          } else {
            log.status = 'success';
            log.feedback = `🚀 [PRODUCCIÓN] ¡Publicación exitosa! Link: ${pubResult.value.url ?? pubResult.value.postId}`;
          }
        }
      }
    }

    await repo.appendExecutionLogs(input.id, logs);
    
    if (campaign.status === 'deploying') {
      await repo.update(input.id, { status: 'active' });
    }

    return ok({ logsAppended: logs.length, currentDay });
  } catch (e: any) {
    if (e?.name === 'ZodError') {
      return err(validationError('Log de ejecución inválido', e.message));
    }
    const message = e?.message ? e.message : String(e);
    return err(unavailable(`No se pudo ejecutar: ${message}`));
  }
}
