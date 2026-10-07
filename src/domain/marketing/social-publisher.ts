import type { Result } from '@/domain/shared/result';
import type { DomainError } from '@/domain/shared/errors';

export interface PublishOptions {
  platform: 'instagram' | 'tiktok' | 'linkedin' | 'x' | 'youtube' | string;
  videoUrl?: string;
  imageUrl?: string;
  caption: string;
  format?: string;
  credentials: { apiKey: string; [key: string]: any };
}

export interface PublishResult {
  postId: string;
  url?: string;
}

export interface SocialPublisher {
  publish(options: PublishOptions): Promise<Result<PublishResult, DomainError>>;
}

