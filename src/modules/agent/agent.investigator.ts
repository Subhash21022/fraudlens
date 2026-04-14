import {
   InvestigationResult,
   MonitoringEventInput,
} from './agent.types';

export function runInvestigator(
   _event: MonitoringEventInput
): InvestigationResult {
   // TODO: implement deterministic preventive-risk analysis.
   throw new Error('runInvestigator is not implemented');
}
