import { z } from 'zod';

export const sampleGetResponseSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const samplePostResponseSchema = z.object({
  id: z.string().min(1),
  value: z.string().min(1),
  createdAt: z.string().min(1),
});

export interface SamplePostRequest {
  value: string;
}

export type SampleGetResponse = z.infer<typeof sampleGetResponseSchema>;
export type SamplePostResponse = z.infer<typeof samplePostResponseSchema>;
