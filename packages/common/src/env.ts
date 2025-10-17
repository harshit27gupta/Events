import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

export const baseEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  SERVICE_NAME: z.string().min(1).default("service"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
});

export type BaseEnv = z.infer<typeof baseEnvSchema>;

export function parseEnv<T extends z.ZodRawShape>(schema: z.ZodObject<T>) {
  const parsed = schema.merge(baseEnvSchema).safeParse(process.env);
  if (!parsed.success) {
    const message = parsed.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
    throw new Error(`Invalid environment: ${message}`);
  }
  return parsed.data as z.infer<typeof schema> & BaseEnv;
}


