/**
 * Catálogo — Sales page / pack multimedia (colección `salesPages`).
 * Tipos conocidos: 'campaign_pack' (orquestable) y 'landing_only' (solo landing).
 * NOTA: los documentos viejos usan alias (social|emails|ad); el mapper
 * futuro normaliza esos alias a las claves canónicas de `AiContent`.
 */
import { z } from 'zod';

export const SalesPageTypeSchema = z.enum(['campaign_pack', 'landing_only']);
export type SalesPageType = z.infer<typeof SalesPageTypeSchema>;

/**
 * Contenido IA del pack. Los ítems son heterogéneos (los valida el
 * motor de templates), aquí solo se garantiza la estructura de listas.
 */
export const AiContentSchema = z.object({
  landings: z.array(z.unknown()).default([]),
  socials: z.array(z.unknown()).default([]),
  emails: z.array(z.unknown()).default([]),
  ads: z.array(z.unknown()).default([]),
}).passthrough();
export type AiContent = z.infer<typeof AiContentSchema>;

export const SalesPageBrandingSchema = z.object({
  primaryColor: z.string().optional(),
  logoUrl: z.string().optional(),
});
export type SalesPageBranding = z.infer<typeof SalesPageBrandingSchema>;

export const SalesPageSchema = z.object({
  id: z.string().min(1, 'id vacío'),
  mentorId: z.string().min(1, 'mentorId vacío'),
  title: z.string().min(1, 'título vacío'),
  courseId: z.string().nullish(),
  productId: z.string().nullish(),
  productType: z.string().nullish(),
  type: SalesPageTypeSchema.default('campaign_pack'),
  targetAudience: z.string().nullish(),
  templateDirectives: z.unknown().optional(),
  templateCollectionId: z.string().nullish(),
  aiContent: AiContentSchema.default({ landings: [], socials: [], emails: [], ads: [] }),
  content: z.unknown().optional(), // Used by V2 atomic renderer
  exportUrls: z.record(z.string()).optional(),
  slug: z.string().optional(),
  branding: SalesPageBrandingSchema.optional(),
  price: z.number().min(0).optional(),
  campaignStatus: z.string().optional(),
  landingType: z.string().optional(),
  isActive: z.boolean().optional(),
  engineMeta: z.unknown().optional(),
  referidoId: z.string().nullable().optional(),
  referidoName: z.string().nullable().optional(),
  activeFrom: z.date().optional(),
  activeUntil: z.date().optional(),
  stats: z.unknown().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});
export type SalesPage = z.infer<typeof SalesPageSchema>;

export function parseSalesPage(data: unknown): SalesPage {
  return SalesPageSchema.parse(data);
}

/** Orquestable en campañas: todo lo que NO sea solo-landing (igual que la UI actual). */
export function isCampaignPack(page: Pick<SalesPage, 'type'>): boolean {
  return page.type !== 'landing_only';
}

export function isLandingOnly(page: Pick<SalesPage, 'type'>): boolean {
  return page.type === 'landing_only';
}

export interface AssetCounts {
  readonly landings: number;
  readonly socials: number;
  readonly emails: number;
  readonly ads: number;
  readonly total: number;
}

export function countAssets(content: AiContent): AssetCounts {
  const landings = content.landings.length;
  const socials = content.socials.length;
  const emails = content.emails.length;
  const ads = content.ads.length;
  return { landings, socials, emails, ads, total: landings + socials + emails + ads };
}

/**
 * Duración sugerida de campaña según videos disponibles.
 * Regla extraída de build/page.tsx: <=1 video → 3 días, 2 videos → 5,
 * 3+ videos → 7 (lanzamiento clásico).
 */
export function recommendedCampaignDays(socialsCount: number): 3 | 5 | 7 {
  if (socialsCount <= 1) return 3;
  if (socialsCount === 2) return 5;
  return 7;
}
