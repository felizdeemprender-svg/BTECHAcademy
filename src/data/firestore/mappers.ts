/**
 * Capa de datos — Mappers puros Firestore -> dominio.
 * Sin llamadas a Firebase: reciben el documento crudo y devuelven
 * la entidad validada. `toDomainDate` normaliza Timestamp/segundos/
 * ISO/millis a Date. Throw si el documento no cumple el schema.
 */
import { toDomainDate } from '@/domain/shared/firestore-mapping';
import { parseCampaign, type Campaign } from '@/domain/marketing';
import {
  parseMentoringProgram,
  parseMentoringSession,
  parseMentoringTask,
  type MentoringProgram,
  type MentoringSession,
  type MentoringTask,
} from '@/domain/mentoring';
import { parseSalesPage, type SalesPage } from '@/domain/catalog';
import { parseCourse, type Course } from '@/domain/catalog';
import { CategorySchema, LevelSchema, type Category, type Level } from '@/domain/catalog';
import { parseEnrollment, type Enrollment, parseLead, type Lead } from '@/domain/commerce';
import { parseUser, type User } from '@/domain/identity';

export type RawDoc = Record<string, unknown>;

function withDateFields<T extends RawDoc>(raw: T): T {
  const out: RawDoc = { ...raw };
  if ('createdAt' in out) {
    const d = toDomainDate(out.createdAt as never);
    if (d === undefined) delete out.createdAt;
    else out.createdAt = d;
  }
  if ('updatedAt' in out) {
    const d = toDomainDate(out.updatedAt as never);
    if (d === undefined) delete out.updatedAt;
    else out.updatedAt = d;
  }
  if ('activeFrom' in out) {
    const d = toDomainDate(out.activeFrom as never);
    if (d === undefined) delete out.activeFrom;
    else out.activeFrom = d;
  }
  if ('activeUntil' in out) {
    const d = toDomainDate(out.activeUntil as never);
    if (d === undefined) delete out.activeUntil;
    else out.activeUntil = d;
  }
  return out as T;
}

export function mapCampaignDoc(id: string, raw: RawDoc): Campaign {
  return parseCampaign(withDateFields({ ...raw, id }));
}

export function mapProgramDoc(id: string, raw: RawDoc): MentoringProgram {
  return parseMentoringProgram(withDateFields({ ...raw, id }));
}

/**
 * Normaliza alias viejos del contenido IA (social/email/ad en singular)
 * a las claves canónicas (socials/emails/ads).
 */
export function normalizeAiContent(raw: unknown): {
  landings: unknown[];
  socials: unknown[];
  emails: unknown[];
  ads: unknown[];
} {
  const c = (raw ?? {}) as Record<string, unknown>;
  const asArray = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
  return {
    landings: asArray(c.landings),
    socials: asArray(c.socials ?? c.social),
    emails: asArray(c.emails ?? c.email),
    ads: asArray(c.ads ?? c.ad ?? c.adsSet),
  };
}

export function mapSalesPageDoc(id: string, raw: RawDoc): SalesPage {
  const { aiContent, ...rest } = raw;
  return parseSalesPage(withDateFields({ ...rest, id, aiContent: normalizeAiContent(aiContent) }));
}

export function mapSessionDoc(id: string, raw: RawDoc): MentoringSession {
  return parseMentoringSession(withDateFields({ ...raw, id }));
}

export function mapCourseDoc(id: string, raw: RawDoc): Course {
  return parseCourse(withDateFields({ ...raw, id }));
}

export function mapCategoryDoc(id: string, raw: RawDoc): Category {
  return CategorySchema.parse({ ...raw, id });
}

export function mapLevelDoc(id: string, raw: RawDoc): Level {
  return LevelSchema.parse({ ...raw, id });
}

export function mapEnrollmentDoc(id: string, raw: RawDoc): Enrollment {
  return parseEnrollment(withDateFields({ ...raw, id }));
}

export function mapLeadDoc(id: string, raw: RawDoc): Lead {
  return parseLead(withDateFields({ ...raw, id }));
}

/**
 * El documento `users` usa el id del documento como `uid`
 * (igual que `api/tutors/by-id/[id]` que lee `users` doc(id) directo).
 */
export function mapUserDoc(id: string, raw: RawDoc): User {
  return parseUser(withDateFields({ ...raw, uid: id }));
}export function mapTaskDoc(id: string, followUpId: string, raw: RawDoc): MentoringTask {
  return parseMentoringTask(withDateFields({ ...raw, id, followUpId }));
}
