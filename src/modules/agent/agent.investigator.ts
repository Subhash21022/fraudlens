import {
   CitizenSummaryInput,
   InvestigationResult,
} from './agent.types';

const clampScore = (score: number) => Math.max(0, Math.min(100, score));

function getNumericSignal(
   value: unknown
): number | undefined {
   return typeof value === 'number' ? value : undefined;
}

export function runInvestigator(
   citizen: CitizenSummaryInput
): InvestigationResult {
   let riskScore = 0;
   const riskIndicators: string[] = [];
   const activityLatest = getNumericSignal(citizen.metrics?.activity?.latest) ?? 0;
   const sleepLatest = getNumericSignal(citizen.metrics?.sleep?.latest) ?? 0;
   const exposureLatest = getNumericSignal(citizen.metrics?.exposure?.latest) ?? 0;

   if (activityLatest < 25) {
      riskScore += 25;
      riskIndicators.push('Physical activity is critically low');
   } else if (activityLatest < 35) {
      riskScore += 15;
      riskIndicators.push('Physical activity is below a healthy range');
   }

   if (sleepLatest < 40) {
      riskScore += 20;
      riskIndicators.push('Sleep quality is critically low');
   } else if (sleepLatest < 50) {
      riskScore += 10;
      riskIndicators.push('Sleep quality is below baseline expectations');
   }

   if (exposureLatest > 75) {
      riskScore += 20;
      riskIndicators.push('Environmental exposure is very high');
   } else if (exposureLatest > 60) {
      riskScore += 10;
      riskIndicators.push('Environmental exposure is elevated');
   }

   const activityDelta = getNumericSignal(
      citizen.metrics?.activity?.deltaFromRecentMean5
   );
   if (activityDelta !== undefined && activityDelta < -8) {
      riskScore += 15;
      riskIndicators.push('Physical activity has dropped from the recent baseline');
   } else if (activityDelta !== undefined && activityDelta < -4) {
      riskScore += 10;
      riskIndicators.push('Physical activity is trending below the recent baseline');
   }

   const sleepDelta = getNumericSignal(citizen.metrics?.sleep?.deltaFromRecentMean5);
   if (sleepDelta !== undefined && sleepDelta < -8) {
      riskScore += 15;
      riskIndicators.push('Sleep quality has sharply declined from the recent baseline');
   } else if (sleepDelta !== undefined && sleepDelta < -4) {
      riskScore += 10;
      riskIndicators.push('Sleep quality is trending below the recent baseline');
   }

   const stabilityScore = citizen.locationSummary?.stabilityScore;
   if (stabilityScore !== undefined && stabilityScore < 0.3) {
      riskScore += 15;
      riskIndicators.push('Mobility pattern is highly unstable');
   } else if (stabilityScore !== undefined && stabilityScore < 0.5) {
      riskScore += 10;
      riskIndicators.push('Mobility pattern is somewhat unstable');
   }

   const environmentalStressScore =
      citizen.locationSummary?.environmentalStressScore;
   if (environmentalStressScore !== undefined && environmentalStressScore > 0.8) {
      riskScore += 15;
      riskIndicators.push('Location-derived environmental stress is severe');
   } else if (
      environmentalStressScore !== undefined &&
      environmentalStressScore > 0.6
   ) {
      riskScore += 10;
      riskIndicators.push('Location-derived environmental stress is elevated');
   }

   if (citizen.persona?.flags?.personaRiskSignalsPresent) {
      riskScore += 10;
      riskIndicators.push('Persona context includes risk-oriented signals');
   }

   if (riskIndicators.length >= 3) {
      riskScore += 10;
      riskIndicators.push('Multiple moderate risk signals are stacking together');
   }

   const finalRiskScore = clampScore(riskScore);
   const shouldEscalateToDecider = finalRiskScore >= 35;

   const summaryParts = [
      `Activity ${activityLatest}`,
      `Sleep ${sleepLatest}`,
      `Exposure ${exposureLatest}`,
      `Events ${citizen.timeline.totalEvents}`,
   ];

   if (riskIndicators.length > 0) {
      summaryParts.push(`Indicators: ${riskIndicators.slice(0, 3).join('; ')}`);
   } else {
      summaryParts.push('Indicators: no strong deterministic warning signs');
   }

   return {
      eventId: `citizen:${citizen.citizenId}`,
      citizenId: citizen.citizenId,
      riskScore: finalRiskScore,
      riskIndicators,
      summary: summaryParts.join(' | '),
      shouldEscalateToDecider,
   };
}
