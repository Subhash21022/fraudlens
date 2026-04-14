import {
   InvestigationResult,
   MonitoringEventInput,
} from '../modules/agent/agent.types';

export function buildPreventiveSupportPrompt(
   _event: MonitoringEventInput,
   _investigation: InvestigationResult
): string {
   // TODO: return the preventive-support decision prompt for the LLM.
   throw new Error('buildPreventiveSupportPrompt is not implemented');
}
