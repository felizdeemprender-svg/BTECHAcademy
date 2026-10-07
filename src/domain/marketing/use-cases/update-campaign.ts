/**
 * Marketing — Casos de uso de escritura de campañas.
 * Replican las escrituras actuales (mismos campos + `updatedAt`):
 * guardar plan, alternar piloto y borrar documento.
 * El borrado NO toca Drive (la limpieza sigue en la página, sin cambios).
 */
import { err, ok, type Result } from '@/domain/shared/result';
import { getStorage } from 'firebase-admin/storage';
import {
  notFound,
  unavailable,
  validationError,
  type DomainError,
} from '@/domain/shared/errors';

import { CampaignPatchSchema } from '../campaign-repository';
import type { CampaignRepository } from '../campaign-repository';

function toUnavailable(e: unknown, what: string): DomainError {
  const message = e instanceof Error ? e.message : String(e);
  return unavailable(`No se pudo ${what}: ${message}`);
}

export interface UpdateCampaignStrategyInput {
  readonly id: string;
  readonly strategy: unknown;
}

export async function updateCampaignStrategy(
  repo: CampaignRepository,
  input: UpdateCampaignStrategyInput,
): Promise<Result<void, DomainError>> {
  if (input.id.trim() === '') return err(validationError('id vacío'));
  const parsed = CampaignPatchSchema.safeParse({ strategy: input.strategy });
  if (!parsed.success) {
    return err(validationError('Estrategia inválida', parsed.error.flatten()));
  }
  try {
    const existing = await repo.findById(input.id);
    if (!existing) return err(notFound(`Campaña ${input.id} no encontrada`));
    await repo.update(input.id, { strategy: parsed.data.strategy });
    return ok(undefined);
  } catch (e) {
    return err(toUnavailable(e, 'guardar la estrategia'));
  }
}

export interface SetCampaignAutoPilotInput {
  readonly id: string;
  readonly autoPilot: boolean;
}

export async function setCampaignAutoPilot(
  repo: CampaignRepository,
  input: SetCampaignAutoPilotInput,
): Promise<Result<void, DomainError>> {
  if (input.id.trim() === '') return err(validationError('id vacío'));
  try {
    const existing = await repo.findById(input.id);
    if (!existing) return err(notFound(`Campaña ${input.id} no encontrada`));
    await repo.update(input.id, { autoPilot: input.autoPilot });
    return ok(undefined);
  } catch (e) {
    return err(toUnavailable(e, 'cambiar el modo piloto'));
  }
}

export async function removeCampaign(
  repo: CampaignRepository,
  id: string,
): Promise<Result<void, DomainError>> {
  if (id.trim() === '') return err(validationError('id vacío'));
  try {
    const existing = await repo.findById(id);
    if (!existing) return err(notFound(`Campaña ${id} no encontrada`));
    
    // Hard Delete: Limpieza de assets en Firebase Storage
    try {
      const bucket = getStorage().bucket();
      const prefix = `campaigns/${id}/`;
      const [files] = await bucket.getFiles({ prefix });
      if (files.length > 0) {
        console.log(`[CascadeDelete] Borrando ${files.length} archivos de Storage para campaña ${id}`);
        await Promise.all(files.map(f => f.delete()));
      }
    } catch (storageError: any) {
      console.warn(`[CascadeDelete] Falló limpieza de storage para campaña ${id}`, storageError.message);
    }

    await repo.remove(id);
    return ok(undefined);
  } catch (e) {
    return err(toUnavailable(e, 'eliminar la campaña'));
  }
}
