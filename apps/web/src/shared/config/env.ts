import { z } from 'zod';

const browserEnvSchema = z.object({
  VITE_API_BASE_URL: z.string().default(''),
});

export const browserEnv = browserEnvSchema.parse(import.meta.env);
