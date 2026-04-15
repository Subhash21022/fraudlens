import fs from 'node:fs/promises';
import path from 'node:path';
import { PipelineResult, RunSummary } from './agent.types';
import { AGENT_OUTPUT_FILE } from '../../config';

export async function writeResults(
   results: PipelineResult[]
): Promise<string> {
   const citizenIds = Array.from(
      new Set(
         results
            .filter(result => result.decision === 'activate_support')
            .map(result => result.citizenId)
      )
   );

   await fs.mkdir(path.dirname(AGENT_OUTPUT_FILE), { recursive: true });
   await fs.writeFile(AGENT_OUTPUT_FILE, citizenIds.join('\n'), 'utf-8');

   return AGENT_OUTPUT_FILE;
}

export function buildRunSummary(results: PipelineResult[]): RunSummary {
   const investigatorOnlyCount = results.filter(
      result => result.source === 'investigator'
   ).length;
   const llmReviewedCount = results.filter(
      result => result.source === 'decider'
   ).length;
   const activatedSupportCount = results.filter(
      result => result.decision === 'activate_support'
   ).length;

   return {
      totalEvents: results.length,
      investigatorOnlyCount,
      llmReviewedCount,
      activatedSupportCount,
   };
}
