import { randomInt } from 'node:crypto';
import { envConfig } from '../config';
import { LangfuseSpanProcessor } from '@langfuse/otel';
import { propagateAttributes, startActiveObservation } from '@langfuse/tracing';
import { NodeSDK } from '@opentelemetry/sdk-node';

export type LangfuseRunContext = {
   sessionId: string;
   enabled: boolean;
};

type LlmObservationInput = {
   name: string;
   model: string;
   prompt: string;
   temperature?: number;
};

type LlmObservationResult = {
   content: string;
   promptTokens: number;
   completionTokens: number;
   totalTokens: number;
   estimatedCostUsd?: number;
};

let sdk: NodeSDK | null = null;
let sdkStarted = false;
let currentRunContext: LangfuseRunContext | null = null;

const ULID_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function encodeBase32(value: number, length: number): string {
   let encoded = '';
   let remaining = value;

   for (let i = 0; i < length; i += 1) {
      const index = remaining % 32;
      encoded = ULID_ALPHABET[index] + encoded;
      remaining = Math.floor(remaining / 32);
   }

   return encoded;
}

function generateUlid(): string {
   const timePart = encodeBase32(Date.now(), 10);
   let randomPart = '';

   for (let i = 0; i < 16; i += 1) {
      randomPart += ULID_ALPHABET[randomInt(32)];
   }

   return `${timePart}${randomPart}`;
}

function sanitizeTeamName(teamName: string): string {
   return teamName.trim().replace(/\s+/g, '-');
}

function generateSessionId(): string {
   const teamName = sanitizeTeamName(envConfig.TEAM_NAME);
   return `${teamName}-${generateUlid()}`;
}

function isLangfuseConfigured(): boolean {
   return Boolean(
      envConfig.LANGFUSE_PUBLIC_KEY &&
         envConfig.LANGFUSE_SECRET_KEY &&
         envConfig.LANGFUSE_HOST
   );
}

async function ensureLangfuseInitialized(): Promise<boolean> {
   if (!isLangfuseConfigured()) {
      return false;
   }

   if (!sdk) {
      sdk = new NodeSDK({
         spanProcessors: [
            new LangfuseSpanProcessor({
               publicKey: envConfig.LANGFUSE_PUBLIC_KEY,
               secretKey: envConfig.LANGFUSE_SECRET_KEY,
               baseUrl: envConfig.LANGFUSE_HOST,
               exportMode: 'immediate',
            }),
         ],
      });
   }

   if (!sdkStarted) {
      await sdk.start();
      sdkStarted = true;
   }

   return true;
}

export async function startLangfuseRun(): Promise<LangfuseRunContext> {
   const enabled = await ensureLangfuseInitialized();
   const fixedSessionId = envConfig.LANGFUSE_SESSION_ID?.trim();
   const context = {
      sessionId:
         fixedSessionId && fixedSessionId.length > 0
            ? fixedSessionId
            : generateSessionId(),
      enabled,
   };

   currentRunContext = context;
   return context;
}

export async function runWithLangfuseTrace<T>(
   name: string,
   work: () => Promise<T>
): Promise<T> {
   const runContext = currentRunContext;

   if (!runContext?.enabled) {
      return work();
   }

   return startActiveObservation(
      name,
      async observation => {
         observation.update({
            metadata: {
               sessionId: runContext.sessionId,
               langfuse_session_id: runContext.sessionId,
            },
         });

         return propagateAttributes(
            { sessionId: runContext.sessionId },
            async () => work()
         );
      },
      { asType: 'span' }
   );
}

export async function observeLlmCall<T extends LlmObservationResult>(
   input: LlmObservationInput,
   work: () => Promise<T>
): Promise<T> {
   const runContext = currentRunContext;

   if (!runContext?.enabled) {
      return work();
   }

   return startActiveObservation(
      input.name,
      async generation => {
         generation.update({
            input: input.prompt,
            model: input.model,
            metadata: {
               langfuse_session_id: runContext.sessionId,
            },
            modelParameters: {
               temperature: input.temperature ?? 0.1,
            },
         });

         const result = await work();

         generation.update({
            output: result.content,
            model: input.model,
            usageDetails: {
               promptTokens: result.promptTokens,
               completionTokens: result.completionTokens,
               totalTokens: result.totalTokens,
            },
            costDetails:
               typeof result.estimatedCostUsd === 'number'
                  ? { totalCost: result.estimatedCostUsd }
                  : undefined,
         });

         return result;
      },
      { asType: 'generation' }
   );
}

export async function flushLangfuse(): Promise<void> {
   if (!sdkStarted || !sdk) {
      return;
   }

   await sdk.shutdown();
   sdkStarted = false;
   sdk = null;
}
