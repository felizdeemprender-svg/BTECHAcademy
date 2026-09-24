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
}

export interface ExecuteCampaignResult {
  readonly logsAppended: number;
  readonly currentDay: number;
}

const SOCIAL_PLATFORMS = ['instagram', 'tiktok', 'linkedin', 'twitter', 'x'] as const;

function motorIdFor(channel: string): string {
  if (channel === 'Email') return 'sendgrid';
  if (channel === 'Social') return 'meta_social';
  return 'meta_ads';
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
    return channel === 'Email'
      ? '💡 [MANUAL SANDBOX] SendGrid SMTP: Correo manual simulado enviado exitosamente a la lista de pruebas.'
      : '💡 [MANUAL SANDBOX] Meta Ads Manager: Campaña publicitaria manual simulada con éxito.';
  }
  return `🚀 [MANUAL PRODUCCIÓN] Emisión Real manual disparada en ${channel === 'Email' ? 'SendGrid' : 'Meta Ads'}!`;
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
        SOCIAL_PLATFORMS.forEach((platform, platIdx) => {
          const sched = action.socialSchedule?.[platform] ?? {
            time: '18:00',
            videoName: `Video ${currentDay}`,
          };
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
            status: 'success',
            mode,
            provider: platform.toUpperCase(),
            feedback: socialFeedback(platform, mode),
            responseId: `${platform}_${currentDay}_${actionIdx}_${platIdx}`,
            protocolVerified: true,
          });
          logs.push(parsed);
        });
      } else {
        const parsed = ExecutionLogSchema.parse({
          timestamp: timestampIso,
          day: currentDay,
          channel,
          action: action.action,
          phase: action.phase,
          variantIndex: action.variantIndex,
          time: channel === 'Email' ? '09:00' : '08:00',
          status: 'success',
          mode,
          provider: channel === 'Email' ? 'SendGrid' : 'Meta Ads',
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
): Promise<Result<ExecuteCampaignResult, DomainError>> {
  if (input.id.trim() === '') return err(validationError('id vacío'));
  try {
    const campaign = await repo.findById(input.id);
    if (!campaign) return err(notFound(`Campaña ${input.id} no encontrada`));

    const now = input.now ?? new Date();
    const currentDay = campaignCurrentDay(parseCampaignDate(campaign.startDate, now), now);
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

    const logs = buildDispatchLogs(today, currentDay, input.credentials, now.toISOString());
    await repo.appendExecutionLogs(input.id, logs);
    return ok({ logsAppended: logs.length, currentDay });
  } catch (e) {
    if (e instanceof Error && e.name === 'ZodError') {
      return err(validationError('Log de ejecución inválido', e.message));
    }
    const message = e instanceof Error ? e.message : String(e);
    return err(unavailable(`No se pudo ejecutar: ${message}`));
  }
}
