import { z } from 'zod';

const fallbackAppName = "my-app";

export const envSchema = z.object({
  appName: z.string().trim().min(1),
  enableReduxLogging: z.boolean(),
  apiBaseUrl: z.string().trim().min(1),
});

export type Env = z.infer<typeof envSchema>;

export const env = Object.freeze(
  envSchema.parse({
    appName: import.meta.env.VITE_APP_NAME?.trim() || fallbackAppName,
    enableReduxLogging: import.meta.env.VITE_ENABLE_REDUX_LOGGING === 'true',
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL?.trim() || '/api',
  }),
);
