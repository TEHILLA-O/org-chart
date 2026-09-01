import { z } from 'zod';

const boolish = z
  .string()
  .optional()
  .transform((value) => value === 'true' || value === '1');

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_URL: z.string().default('http://localhost:3000'),
  DATABASE_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(16),
  AUTH_TRUST_HOST: boolish,
  AUTH_MICROSOFT_ENTRA_ID_ID: z.string().optional(),
  AUTH_MICROSOFT_ENTRA_ID_SECRET: z.string().optional(),
  AUTH_MICROSOFT_ENTRA_ID_TENANT_ID: z.string().optional(),
  ENCRYPTION_KEY: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, 'ENCRYPTION_KEY must be 64 hex characters (32 bytes)'),
  MICROSOFT_CONNECTOR_MODE: z.enum(['mock', 'real']).default('mock'),
  MICROSOFT_GRAPH_BASE_URL: z.string().default('https://graph.microsoft.com/v1.0'),
  MICROSOFT_PHOTO_SYNC: boolish,
  RIPPLING_CONNECTOR_MODE: z.enum(['mock', 'real']).default('mock'),
  RIPPLING_API_TOKEN: z.string().optional(),
  RIPPLING_API_BASE_URL: z.string().default('https://rest.ripplingapis.com'),
  SYNC_SCHEDULER_ENABLED: boolish,
  IMPORT_MAX_BYTES: z.coerce.number().int().positive().default(5_242_880),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  DEEPSEEK_API_KEY: z.string().optional(),
  DEEPSEEK_API_BASE_URL: z.string().default('https://api.deepseek.com'),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_KEY: z.string().optional(),
});

export type AppConfig = z.infer<typeof EnvSchema> & {
  entraEnabled: boolean;
  isProduction: boolean;
};

let cached: AppConfig | null = null;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${details}`);
  }

  const data = parsed.data;
  return {
    ...data,
    entraEnabled: Boolean(
      data.AUTH_MICROSOFT_ENTRA_ID_ID &&
        data.AUTH_MICROSOFT_ENTRA_ID_SECRET &&
        data.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID,
    ),
    isProduction: data.NODE_ENV === 'production',
  };
}

export function config(): AppConfig {
  if (!cached) {
    cached = loadConfig();
  }
  return cached;
}
