import {
   DeciderResult,
   InvestigationResult,
   MonitoringEventInput,
} from './agent.types';

export async function runDecider(
   _event: MonitoringEventInput,
   _investigation: InvestigationResult
): Promise<DeciderResult> {
   // TODO: implement LLM-based preventive support decision.
   throw new Error('runDecider is not implemented');
}
