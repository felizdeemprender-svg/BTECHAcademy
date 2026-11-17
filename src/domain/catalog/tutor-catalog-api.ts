import { z } from 'zod';

export const CatalogOfferTypeSchema = z.enum(['curso', 'programa', 'mentoria']);
export type CatalogOfferType = z.infer<typeof CatalogOfferTypeSchema>;

export interface CatalogOfferPrice {
  amount: number | null;
  currency: string;
  isFree: boolean;
  formatted: string;
}

export interface CatalogPaymentMethodPrice {
  id: string;
  label: string;
  amount: number | null;
  currency: string;
  isFree: boolean;
  formatted: string;
}

export interface CatalogOfferDuration {
  value: number | null;
  unit: string | null;
  label: string | null;
}

export interface CatalogOffer {
  id: string;
  type: CatalogOfferType;
  title: string;
  description: string | null;
  imageUrl: string | null;
  price: CatalogOfferPrice;
  paymentMethods: CatalogPaymentMethodPrice[];
  duration: CatalogOfferDuration | null;
  url: string;
  status: 'published' | 'active';
  activeUntil: string | null;
}

export interface TutorCatalogSummary {
  id: string;
  name: string;
  username: string | null;
}

export interface TutorCatalogResponse {
  tutor: TutorCatalogSummary;
  total: number;
  offers: CatalogOffer[];
}

export type ApiKeyStatus = 'active' | 'blocked' | 'revoked';

export interface TutorCatalogApiKey {
  key: string;
  keyPrefix: string;
  hashedKey: string;
  tutorId: string;
  status: ApiKeyStatus;
  createdAt: string;
  lastUsedAt?: string | null;
  blockedAt?: string | null;
  blockedReason?: string | null;
  windowStart: number;
  windowRequests: number;
}
