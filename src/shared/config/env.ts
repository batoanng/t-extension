import { z } from 'zod';

const fallbackAppName = "my-app";

export const envSchema = z.object({
  appName: z.string().trim().min(1),
});

export type Env = z.infer<typeof envSchema>;

export const env = Object.freeze(
  envSchema.parse({
    appName: import.meta.env.VITE_APP_NAME?.trim() || fallbackAppName,
  }),
);
