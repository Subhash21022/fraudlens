import { envConfig } from '../config';
import { observeLlmCall } from './langfuse';

export type LlmRequest = {
   prompt: string;
   model?: string;
};

export type LlmResponse = {
   content: string;
   promptTokens: number;
   completionTokens: number;
   totalTokens: number;
   estimatedCostUsd?: number;
};

type OpenRouterResponse = {
   choices?: Array<{
      message?: {
         content?: string | null;
      };
   }>;
   usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
   };
   error?: {
      message?: string;
   };
};

export async function callLlm(input: LlmRequest): Promise<LlmResponse> {
   if (!envConfig.OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY is not configured');
   }

   const model = input.model ?? envConfig.OPENROUTER_MODEL;

   return observeLlmCall(
      {
         name: 'openrouter-preventive-decider',
         model,
         prompt: input.prompt,
         temperature: 0.1,
      },
      async () => {
         const response = await fetch(
            'https://openrouter.ai/api/v1/chat/completions',
            {
               method: 'POST',
               headers: {
                  Authorization: `Bearer ${envConfig.OPENROUTER_API_KEY}`,
                  'Content-Type': 'application/json',
               },
               body: JSON.stringify({
                  model,
                  temperature: 0.1,
                  messages: [
                     {
                        role: 'system',
                        content:
                           'You are a careful preventive well-being decision system. Return only valid JSON.',
                     },
                     {
                        role: 'user',
                        content: input.prompt,
                     },
                  ],
               }),
            }
         );

         const payload = (await response.json()) as OpenRouterResponse;

         if (!response.ok) {
            throw new Error(
               payload.error?.message ??
                  `OpenRouter request failed with status ${response.status}`
            );
         }

         const content = payload.choices?.[0]?.message?.content;
         if (!content) {
            throw new Error('OpenRouter response did not contain message content');
         }

         const promptTokens = payload.usage?.prompt_tokens ?? 0;
         const completionTokens = payload.usage?.completion_tokens ?? 0;
         const totalTokens =
            payload.usage?.total_tokens ?? promptTokens + completionTokens;

         return {
            content,
            promptTokens,
            completionTokens,
            totalTokens,
         };
      }
   );
}
