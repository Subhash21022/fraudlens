import { runDecider } from './agent.decider';
import { runInvestigator } from './agent.investigator';
import { buildRunSummary, writeResults } from './agent.writer';
import { MonitoringEventInput, PipelineResult } from './agent.types';

export async function runAgentPipeline(
   _events: MonitoringEventInput[]
): Promise<PipelineResult[]> {
   // TODO: orchestrate investigator -> decider -> writer flow for
   // well-being monitoring events.
   void runInvestigator;
   void runDecider;
   void writeResults;
   void buildRunSummary;

   throw new Error('runAgentPipeline is not implemented');
}

export async function main(): Promise<void> {
   // TODO: load cleaned monitoring events, run pipeline, print summary.
   throw new Error('main is not implemented');
}
