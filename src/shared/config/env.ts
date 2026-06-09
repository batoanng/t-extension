import { z } from 'zod';

const fallbackAppPort = 3001;
const fallbackServerBaseUrl = 'http://localhost:3000';
const fallbackWebBaseUrl = 'http://localhost:3002';

export const envSchema = z.object({
  appPort: z.number().int().positive(),
  serverBaseUrl: z.string().trim().url(),
  webBaseUrl: z.string().trim().url(),
});

export type Env = z.infer<typeof envSchema>;

export const env = Object.freeze(
  envSchema.parse({
    appPort: Number.parseInt(
      import.meta.env.VITE_APP_PORT ?? `${fallbackAppPort}`,
      10,
    ),
    serverBaseUrl:
      import.meta.env.VITE_SERVER_BASE_URL?.trim() || fallbackServerBaseUrl,
    webBaseUrl:
      import.meta.env.VITE_WEB_BASE_URL?.trim() || fallbackWebBaseUrl,
  }),
);
