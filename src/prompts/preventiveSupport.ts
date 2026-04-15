import {
   CitizenSummaryInput,
   InvestigationResult,
} from '../modules/agent/agent.types';

export function buildPreventiveSupportPrompt(
   citizen: CitizenSummaryInput,
   investigation: InvestigationResult
): string {
   const topIndicators =
      investigation.riskIndicators.length > 0
         ? investigation.riskIndicators
              .slice(0, 3)
              .map(indicator => `- ${indicator}`)
              .join('\n')
         : '- No strong deterministic warning signs detected';

   return [
      'You are a preventive well-being decision agent for the Reply Mirror system.',
      'Your task is to decide whether this citizen event needs preventive support.',
      '',
      'Return only a JSON object in this exact format:',
      '{',
      '  "decision": "activate_support" or "continue_monitoring",',
      '  "confidence": number between 0 and 100,',
      '  "reasoning": "one short sentence"',
      '}',
      '',
      'Citizen summary:',
      `- Citizen ID: ${citizen.citizenId}`,
      `- Total events: ${citizen.timeline.totalEvents}`,
      `- Last timestamp: ${citizen.timeline.lastTimestamp}`,
      `- Event type counts: ${JSON.stringify(citizen.timeline.eventTypeCounts ?? {})}`,
      `- Latest activity index: ${citizen.metrics.activity?.latest ?? 0}`,
      `- Latest sleep index: ${citizen.metrics.sleep?.latest ?? 0}`,
      `- Latest exposure index: ${citizen.metrics.exposure?.latest ?? 0}`,
      `- Activity delta from recent mean: ${citizen.metrics.activity?.deltaFromRecentMean5 ?? 0}`,
      `- Sleep delta from recent mean: ${citizen.metrics.sleep?.deltaFromRecentMean5 ?? 0}`,
      `- Exposure delta from recent mean: ${citizen.metrics.exposure?.deltaFromRecentMean5 ?? 0}`,
      `- Activity slope: ${citizen.metrics.activity?.slope ?? 0}`,
      `- Sleep slope: ${citizen.metrics.sleep?.slope ?? 0}`,
      `- Exposure slope: ${citizen.metrics.exposure?.slope ?? 0}`,
      `- Mobility stability score: ${citizen.locationSummary?.stabilityScore ?? 1}`,
      `- Environmental stress score: ${citizen.locationSummary?.environmentalStressScore ?? 0}`,
      `- Persona risk signal: ${citizen.persona?.flags?.personaRiskSignalsPresent ?? false}`,
      `- Persona protective signal: ${citizen.persona?.flags?.personaProtectiveSignalsPresent ?? false}`,
      '',
      'Investigator output:',
      `- Risk score: ${investigation.riskScore}`,
      `- Summary: ${investigation.summary}`,
      '- Top risk indicators:',
      topIndicators,
      '',
      'Decision rule:',
      '- Recommend activate_support only when the combined pattern suggests meaningful preventive intervention is warranted.',
      '- Prefer continue_monitoring when the evidence is weak, mixed, or likely temporary.',
   ].join('\n');
}
