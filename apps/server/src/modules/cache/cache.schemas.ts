import { z } from 'zod';

export const CacheDemoKeySchema = z.string().trim().min(1);

export const CacheDemoRequestSchema = z.object({
  key: CacheDemoKeySchema,
  value: z.string().trim().min(1),
  ttlMs: z.coerce.number().int().positive().max(86_400_000).optional(),
});

export type CacheDemoRequest = z.infer<typeof CacheDemoRequestSchema>;
