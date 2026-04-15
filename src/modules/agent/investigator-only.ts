import fs from 'node:fs/promises';
import { AGENT_DATASET_LABEL, AGENT_INPUT_FILE } from '../../config';
import { runInvestigator } from './agent.investigator';
import { CitizenSummaryInput } from './agent.types';

async function loadMonitoringEvents(): Promise<CitizenSummaryInput[]> {
   const raw = await fs.readFile(AGENT_INPUT_FILE, 'utf-8');
   return JSON.parse(raw) as CitizenSummaryInput[];
}

async function main(): Promise<void> {
   const events = await loadMonitoringEvents();
   const investigations = events.map(event => ({
      event,
      investigation: runInvestigator(event),
   }));
   const escalated = investigations.filter(({ investigation }) =>
      investigation.shouldEscalateToDecider
   );

   console.log(`Dataset: ${AGENT_DATASET_LABEL}`);
   console.log(`Input file: ${AGENT_INPUT_FILE}`);
   console.log(`Loaded ${events.length} monitoring events`);
   console.log(
      `Investigator would pass ${escalated.length} events to the decider`
   );

   if (escalated.length === 0) {
      console.log('No events crossed the investigator threshold.');
      return;
   }

   for (const { investigation } of escalated) {
      console.log(
         [
            'Investigator escalation',
            `eventId=${investigation.eventId}`,
            `citizenId=${investigation.citizenId}`,
            `riskScore=${investigation.riskScore}`,
            `riskIndicators=${investigation.riskIndicators.join('; ') || 'none'}`,
            `summary=${investigation.summary}`,
         ].join(' | ')
      );
   }
}

void main();
