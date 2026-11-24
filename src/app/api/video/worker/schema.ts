import { z } from 'zod';

export const workerPayloadSchema = z.object({
  action: z.enum([
    'generate-full-campaign',
    'draft-full-campaign',
    'process-campaign',
    'generate-single-piece',
    'generate-video',
    'render-v2'
  ]),
  campaignId: z.string().optional(),
  targetAudience: z.string().optional(),
  campaignMission: z.string().optional(),
  autoGenerateImages: z.boolean().optional(),
  googleToken: z.string().nullable().optional(),
  jobId: z.string().optional(),
  renderRequest: z.any().optional(),
  uid: z.string().optional(),
  role: z.string().optional(),
  data: z.record(z.any()).optional(),
  pieceIndex: z.number().optional(),
  socialPiece: z.any().optional(),
  coordinationPlan: z.any().optional(),
  language: z.string().optional(),
}).passthrough();

export type WorkerPayload = z.infer<typeof workerPayloadSchema>;
