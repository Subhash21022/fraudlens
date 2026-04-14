import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

export const envSchema = z.object({
   PORT: z.coerce.number().default(3000),
   MODE: z.enum(['development', 'production', 'test']).default('development'),
   DATABASE_URL: z
      .string()
      .min(1, 'DATABASE_URL is required in the environment variables'),

   // URLs
   BACKEND_URL: z.string().url().default('http://localhost:3000'),
   FRONTEND_URL: z.string().url().default('http://localhost:5173'),

   OPENROUTER_API_KEY: z.string().optional(),
   OPENROUTER_MODEL: z.string().default('google/gemma-4-31b-it:free'),
   LANGFUSE_PUBLIC_KEY: z.string().optional(),
   LANGFUSE_SECRET_KEY: z.string().optional(),
   LANGFUSE_HOST: z.string().url().default('https://cloud.langfuse.com'),
});

export const envConfig = envSchema.parse(process.env);

export const appConfig = {
   allowedOrigins: [
      'http://localhost:5173',
      'http://localhost:3000',
      envConfig.FRONTEND_URL,
   ].filter(Boolean),
};
