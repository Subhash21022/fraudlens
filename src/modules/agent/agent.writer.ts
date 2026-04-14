import { PipelineResult, RunSummary } from './agent.types';

export async function writeResults(
   _results: PipelineResult[]
): Promise<void> {
   // TODO: write Citizen IDs recommended for preventive support.
   throw new Error('writeResults is not implemented');
}

export function buildRunSummary(_results: PipelineResult[]): RunSummary {
   // TODO: summarize preventive-support pipeline execution metrics.
   throw new Error('buildRunSummary is not implemented');
}
