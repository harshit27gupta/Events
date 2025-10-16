import dotenv from 'dotenv';
dotenv.config();

type RequiredEnv = {
  NODE_ENV: string;
  PORT?: string;
};

export function requireEnv<T extends string>(keys: T[]): Record<T, string> {
  const missing: string[] = [];
  const values = {} as Record<T, string>;
  for (const key of keys) {
    const value = process.env[key];
    if (!value) missing.push(key);
    else values[key] = value;
  }
  if (missing.length) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }
  return values;
}


