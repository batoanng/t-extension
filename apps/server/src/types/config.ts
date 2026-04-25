import { z } from 'zod';

function trimString(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function toOptionalTrimmedString(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : undefined;
}

function toBooleanFlag(value: unknown): unknown {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();

    if (normalized === '1' || normalized === 'true') {
      return true;
    }

    if (normalized === '0' || normalized === 'false') {
      return false;
    }
  }

  return value;
}

function toOriginList(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const origins = value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  return origins.length > 0 ? origins : undefined;
}

function parseDurationToSeconds(fieldName: string, value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value);

  if (!match) {
    throw new Error(`Invalid ${fieldName} duration: ${value}`);
  }

  const amount = Number(match[1]);
  const unit = match[2];

  const unitToSeconds = { s: 1, m: 60, h: 60 * 60, d: 60 * 60 * 24 } as const;

  return amount * unitToSeconds[unit as keyof typeof unitToSeconds];
}

const stringSchema = z.preprocess(trimString, z.string().min(1));
const optionalStringSchema = z.preprocess(
  toOptionalTrimmedString,
  z.string().min(1).optional(),
);
const booleanFlagSchema = z.preprocess(toBooleanFlag, z.boolean());
const corsOriginSchema = z.preprocess(
  toOriginList,
  z.array(z.string().min(1)).optional(),
);
const durationSchema = z
  .string()
  .trim()
  .regex(/^\d+[smhd]$/, 'Use a duration like 15m, 1h, or 7d.');

export const configSchema = z.object({
  API_PORT: z.coerce.number().int().positive(),
  API_VERSION: z.coerce.number().int().positive(),
  SWAGGER_ENABLE: booleanFlagSchema,
  DATABASE_URL: z.string().min(1),
  HEALTH_TOKEN: z.string().min(1),
  ACCESS_SECRET: z.string().min(1),
  REFRESH_SECRET: z.string().min(1),
  ACCESS_EXPIRES_IN: durationSchema.default('15m'),
  REFRESH_EXPIRES_IN: durationSchema.default('7d'),
  CORS_ORIGIN: corsOriginSchema,
  REDIS_HOST: z.string().min(1),
  REDIS_PORT: z.coerce.number().int().positive(),
  REDIS_USERNAME: optionalStringSchema,
  REDIS_PASSWORD: optionalStringSchema,
  OPENAI_API_KEY: optionalStringSchema,
  OPENAI_MODEL: z.string().trim().min(1).default('gpt-4o-mini'),
  DEEPSEEK_API_KEY: optionalStringSchema,
  DEEPSEEK_MODEL: z.string().trim().min(1).default('deepseek-chat'),
  DEEPSEEK_BASE_URL: z
    .string()
    .trim()
    .url()
    .default('https://api.deepseek.com/v1'),
  PROMPT_OPTIMIZER_PRO_PRICE_AUD_MONTHLY: z.coerce.number().positive().default(5),
  STRIPE_SECRET_KEY: optionalStringSchema,
  STRIPE_WEBHOOK_SECRET: optionalStringSchema,
  STRIPE_PRO_MONTHLY_PRICE_ID: optionalStringSchema,
  STRIPE_SUCCESS_URL: z
    .string()
    .trim()
    .url()
    .default('https://example.com/success'),
  STRIPE_CANCEL_URL: z
    .string()
    .trim()
    .url()
    .default('https://example.com/cancel'),
  RESEND_API_KEY: optionalStringSchema,
  EMAIL_FROM: z.string().trim().email().default('noreply@example.com'),
});

type BaseConfig = z.infer<typeof configSchema>;

export type Config = Readonly<
  BaseConfig & {
    ACCESS_EXPIRES_IN_SECONDS: number;
    REFRESH_EXPIRES_IN_SECONDS: number;
  }
>;

let cachedConfig: Config | undefined;

function formatConfigError(error: z.ZodError): string {
  const fieldErrors = error.flatten().fieldErrors;
  return `Configuration not valid:\n${JSON.stringify(fieldErrors, null, 2)}`;
}

export function getConfig(): Config {
  if (cachedConfig) {
    return cachedConfig;
  }

  const result = configSchema.safeParse(process.env);

  if (!result.success) {
    throw new Error(formatConfigError(result.error));
  }

  cachedConfig = Object.freeze({
    ...result.data,
    ACCESS_EXPIRES_IN_SECONDS: parseDurationToSeconds(
      'ACCESS_EXPIRES_IN',
      result.data.ACCESS_EXPIRES_IN,
    ),
    REFRESH_EXPIRES_IN_SECONDS: parseDurationToSeconds(
      'REFRESH_EXPIRES_IN',
      result.data.REFRESH_EXPIRES_IN,
    ),
  });

  return cachedConfig;
}

export const config = getConfig();
