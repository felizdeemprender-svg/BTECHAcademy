/**
 * Catálogo — Nivel (colección `levels`, ordenada por `order`).
 */
import { z } from 'zod';

export const LevelSchema = z.object({
  id: z.string().min(1, 'id vacío'),
  name: z.string().min(1, 'nombre vacío'),
  description: z.string().optional(),
  order: z.number().int().min(0),
});
export type Level = z.infer<typeof LevelSchema>;
