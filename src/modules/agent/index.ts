import fs from 'node:fs/promises';
import { runDecider } from './agent.decider';
import { runInvestigator } from './agent.investigator';
import { buildRunSummary, writeResults } from './agent.writer';
import { AGENT_INPUT_FILE } from '../../config';
import {
   flushLangfuse,
   runWithLangfuseTrace,
   startLangfuseRun,
} from '../../utils/langfuse';
import { CitizenSummaryInput, PipelineResult } from './agent.types';

export async function loadMonitoringEvents(
   filePath = AGENT_INPUT_FILE
): Promise<CitizenSummaryInput[]> {
   const raw = await fs.readFile(filePath, 'utf-8');
   return JSON.parse(raw) as CitizenSummaryInput[];
}

export async function runAgentPipeline(
   citizens: CitizenSummaryInput[]
): Promise<PipelineResult[]> {
   const results: PipelineResult[] = [];
   const investigations = citizens.map(citizen => ({
      citizen,
      investigation: runInvestigator(citizen),
   }));
   const escalatedToDeciderCount = investigations.filter(
      ({ investigation }) => investigation.shouldEscalateToDecider
   ).length;

   console.log(
      `Investigator passed ${escalatedToDeciderCount} events to the decider`
   );

   for (const { citizen, investigation } of investigations) {
      if (!investigation.shouldEscalateToDecider) {
         results.push({
            eventId: investigation.eventId,
            citizenId: citizen.citizenId,
            decision: 'continue_monitoring',
            source: 'investigator',
            riskScore: investigation.riskScore,
            riskIndicators: investigation.riskIndicators,
            reasoning: 'Below investigator escalation threshold.',
         });
         continue;
      }

      const deciderResult = await runDecider(citizen, investigation);
      console.log(
         [
            `Decider review`,
            `eventId=${deciderResult.eventId}`,
            `citizenId=${deciderResult.citizenId}`,
            `decision=${deciderResult.decision}`,
            `confidence=${deciderResult.confidence}`,
            `reasoning=${deciderResult.reasoning}`,
         ].join(' | ')
      );

      results.push({
         eventId: investigation.eventId,
         citizenId: citizen.citizenId,
         decision: deciderResult.decision,
         source: 'decider',
         riskScore: investigation.riskScore,
         riskIndicators: investigation.riskIndicators,
         confidence: deciderResult.confidence,
         reasoning: deciderResult.reasoning,
      });
   }

   return results;
}

export async function main(): Promise<void> {
   const langfuseRun = await startLangfuseRun();
   console.log(
      `Langfuse session ID: ${langfuseRun.sessionId}${
         langfuseRun.enabled ? '' : ' (tracking disabled: missing config)'
      }`
   );

   try {
      await runWithLangfuseTrace('reply-mirror-agent-run', async () => {
         const citizens = await loadMonitoringEvents(AGENT_INPUT_FILE);
         console.log(
            `Loaded ${citizens.length} citizen summaries from ${AGENT_INPUT_FILE}`
         );

         const results = await runAgentPipeline(citizens);
         console.log(`Created ${results.length} pipeline results`);

         const summary = buildRunSummary(results);
         console.log(
            `Investigator-only: ${summary.investigatorOnlyCount} | Decider-reviewed: ${summary.llmReviewedCount} | Activate-support: ${summary.activatedSupportCount}`
         );

         const outputPath = await writeResults(results);
         console.log(`Wrote output file to ${outputPath}`);
      });
   } finally {
      await flushLangfuse();
   }
}

void main();
