import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  // Anthropic
  ANTHROPIC_API_KEY: z.string().min(1, 'ANTHROPIC_API_KEY is required'),
  ANTHROPIC_MODEL_MASTER: z.string().default('claude-opus-4-7'),
  ANTHROPIC_MODEL_SUBAGENT: z.string().default('claude-sonnet-4-6'),
  ANTHROPIC_MODEL_CLASSIFIER: z.string().default('claude-haiku-4-5'),

  // Server
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // Webhook auth (optional in dev)
  WEBHOOK_SECRET: z.string().optional(),

  // Integration providers — default to 'mock' for the bootstrap milestone
  CRM_PROVIDER: z.enum(['mock', 'real']).default('mock'),
  CRM_BASE_URL: z.string().optional(),
  CRM_API_KEY: z.string().optional(),

  WHATSAPP_PROVIDER: z.enum(['mock', 'real']).default('mock'),
  WHATSAPP_PHONE_ID: z.string().optional(),
  WHATSAPP_ACCESS_TOKEN: z.string().optional(),

  GMAIL_PROVIDER: z.enum(['mock', 'real']).default('mock'),
  GMAIL_CLIENT_ID: z.string().optional(),
  GMAIL_CLIENT_SECRET: z.string().optional(),
  GMAIL_REFRESH_TOKEN: z.string().optional(),

  CALENDAR_PROVIDER: z.enum(['mock', 'real']).default('mock'),
  CALENDAR_ID: z.string().default('primary'),

  DRIVE_PROVIDER: z.enum(['mock', 'real']).default('mock'),
  DRIVE_FOLDER_ID: z.string().optional(),

  // MVP-1 — Lead Intake flow configuration
  ADVISOR_NOTIFICATION_EMAIL: z.string().email().default('adi@cnt-fin.com'),
  ADVISOR_USER_ID: z.string().default('advisor_adi'),
  LEAD_FOLLOWUP_SLA_HOURS: z.coerce.number().int().positive().default(4),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

/**
 * Lazy-load and validate environment variables.
 * In test, allows the ANTHROPIC_API_KEY to be a dummy value.
 */
export function loadEnv(): Env {
  if (cached) return cached;

  // Allow tests to bypass API key requirement
  if (process.env.NODE_ENV === 'test' && !process.env.ANTHROPIC_API_KEY) {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key';
  }

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Environment validation failed:\n${issues}`);
  }

  cached = parsed.data;
  return cached;
}

/** Clear the cached env (for tests). */
export function resetEnv(): void {
  cached = undefined;
}
