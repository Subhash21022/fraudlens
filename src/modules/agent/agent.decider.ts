import { envConfig } from '../../config';
import { buildPreventiveSupportPrompt } from '../../prompts/preventiveSupport';
import { callLlm } from '../../utils/llm';
import {
   CitizenSummaryInput,
   DeciderResult,
   InvestigationResult,
} from './agent.types';

function extractJsonBlock(content: string): string {
   const fencedMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
   if (fencedMatch?.[1]) {
      return fencedMatch[1].trim();
   }

   const startIndex = content.indexOf('{');
   const endIndex = content.lastIndexOf('}');
   if (startIndex >= 0 && endIndex > startIndex) {
      return content.slice(startIndex, endIndex + 1);
   }

   return content.trim();
}

function normalizeDecision(value: string): DeciderResult['decision'] {
   return value === 'activate_support'
      ? 'activate_support'
      : 'continue_monitoring';
}

export async function runDecider(
   citizen: CitizenSummaryInput,
   investigation: InvestigationResult
): Promise<DeciderResult> {
   if (!envConfig.OPENROUTER_API_KEY) {
      return {
         eventId: investigation.eventId,
         citizenId: investigation.citizenId,
         decision: 'continue_monitoring',
         confidence: 0,
         reasoning: 'Decider fallback: OPENROUTER_API_KEY is not configured.',
      };
   }

   const prompt = buildPreventiveSupportPrompt(citizen, investigation);

   try {
      const response = await callLlm({ prompt });
      const parsed = JSON.parse(extractJsonBlock(response.content)) as {
         decision?: string;
         confidence?: number;
         reasoning?: string;
      };

      return {
         eventId: investigation.eventId,
         citizenId: investigation.citizenId,
         decision: normalizeDecision(parsed.decision ?? 'continue_monitoring'),
         confidence:
            typeof parsed.confidence === 'number'
               ? Math.max(0, Math.min(100, parsed.confidence))
               : 0,
         reasoning:
            typeof parsed.reasoning === 'string' && parsed.reasoning.length > 0
               ? parsed.reasoning
               : 'LLM response did not include reasoning.',
      };
   } catch (error) {
      const message =
         error instanceof Error ? error.message : 'Unknown decider failure';

      return {
         eventId: investigation.eventId,
         citizenId: investigation.citizenId,
         decision: 'continue_monitoring',
         confidence: 0,
         reasoning: `Decider fallback: ${message}`,
      };
   }
}
