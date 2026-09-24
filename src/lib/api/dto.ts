/**
 * API — DTOs serializados (lo que viaja por JSON).
 * `Date` del dominio llega como string ISO; `Serialized<T>`
 * lo refleja a nivel de tipos sin duplicar shapes.
 */
import type { CampaignSummary } from '@/domain/marketing/use-cases/get-mentor-campaigns';
import type { ProgramSummary } from '@/domain/mentoring/use-cases/get-mentor-programs';
import type { CoordinationOutput } from '@/domain/marketing';
import type { SalesPage } from '@/domain/catalog';

export type Serialized<T> = T extends Date
  ? string
  : T extends readonly (infer U)[]
    ? Serialized<U>[]
    : T extends object
      ? { [K in keyof T]: Serialized<T[K]> }
      : T;

export type ApiCampaignSummary = Serialized<CampaignSummary>;
export type ApiProgramSummary = Serialized<ProgramSummary>;
export type ApiSalesPage = Serialized<SalesPage>;
export type ApiCoordinationOutput = Serialized<CoordinationOutput>;
export interface ApiCreateCampaignResult {
  readonly id: string;
}
