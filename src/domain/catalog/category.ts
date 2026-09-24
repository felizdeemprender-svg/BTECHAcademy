/**
 * Catálogo — Categoría (colección `categories`, ordenada por nombre).
 */
import { z } from 'zod';

export const CategorySchema = z.object({
  id: z.string().min(1, 'id vacío'),
  name: z.string().min(1, 'nombre vacío'),
  description: z.string().optional(),
});
export type Category = z.infer<typeof CategorySchema>;
