import path from 'node:path';
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
   TEAM_NAME: z.string().default('tutorial'),
   LANGFUSE_PUBLIC_KEY: z.string().optional(),
   LANGFUSE_SECRET_KEY: z.string().optional(),
   LANGFUSE_HOST: z
      .string()
      .url()
      .default('https://challenges.reply.com/langfuse'),
});

export const envConfig = envSchema.parse(process.env);

export const appConfig = {
   allowedOrigins: [
      'http://localhost:5173',
      'http://localhost:3000',
      envConfig.FRONTEND_URL,
   ].filter(Boolean),
};

// Change this one value when you want to switch challenge datasets.
export const AGENT_INPUT_FILE = path.resolve(
   process.cwd(),
   'data/cleaned/public_lev_1/monitoring-events.json'
);

export const AGENT_DATASET_LABEL = path.basename(
   path.dirname(AGENT_INPUT_FILE)
);

export const AGENT_OUTPUT_FILE = path.resolve(
   process.cwd(),
   'output',
   `${AGENT_DATASET_LABEL}.txt`
);
