export type UserProfile = {
   citizenId: string;
   birthYear?: number;
   age?: number;
   job?: string;
   residence?: Record<string, unknown>;
};

export type LocationPoint = {
   datetime: string;
   lat: number;
   lng: number;
};

export type LocationSummary = {
   points: LocationPoint[];
   mobilityScore?: number;
   stabilityScore?: number;
   environmentalStressScore?: number;
   uniqueCities10?: number;
   totalDistanceKm10?: number;
   avgStepDistanceKm10?: number;
   distanceFromHomeKm?: number;
};

export type PersonaSummary = {
   citizenId: string;
   name?: string;
   ageFromPersona?: number;
   occupationFromPersona?: string;
   cityFromPersona?: string;
   narrative?: string;
   mobilityDescription?: string;
   healthBehaviorDescription?: string;
   socialPatternDescription?: string;
   flags?: Record<string, boolean>;
};

export type TimelineSummary = {
   firstTimestamp: string;
   lastTimestamp: string;
   totalEvents: number;
   daysCovered?: number;
   averageDaysBetweenEvents?: number | null;
   eventTypeCounts?: Record<string, number>;
};

export type MetricSummary = {
   first?: number;
   latest?: number;
   deltaFromFirst?: number;
   deltaFromRecentMean5?: number;
   min?: number;
   max?: number;
   mean?: number;
   median?: number;
   std?: number;
   slope?: number;
};

export type CitizenMetrics = {
   activity?: MetricSummary;
   sleep?: MetricSummary;
   exposure?: MetricSummary;
};

export type CitizenSummaryInput = {
   citizenId: string;
   user?: UserProfile;
   persona?: PersonaSummary | null;
   timeline: TimelineSummary;
   metrics: CitizenMetrics;
   locationSummary?: LocationSummary;
   preprocessFlags?: Record<string, boolean>;
   qualityFlags?: string[];
   pythonInvestigatorPreview?: {
      riskScore?: number;
      reasons?: string[];
      shouldEscalate?: boolean;
   };
   events?: Array<Record<string, unknown>>;
};

export type InvestigationResult = {
   eventId: string;
   citizenId: string;
   riskScore: number;
   riskIndicators: string[];
   summary: string;
   shouldEscalateToDecider: boolean;
};

export type PreventiveDecision =
   | 'activate_support'
   | 'continue_monitoring';

export type DeciderResult = {
   eventId: string;
   citizenId: string;
   decision: PreventiveDecision;
   confidence: number;
   reasoning: string;
};

export type PipelineResult = {
   eventId: string;
   citizenId: string;
   decision: PreventiveDecision;
   source: 'investigator' | 'decider';
   riskScore?: number;
   confidence?: number;
   reasoning?: string;
   riskIndicators?: string[];
};

export type RunSummary = {
   totalEvents: number;
   investigatorOnlyCount: number;
   llmReviewedCount: number;
   activatedSupportCount: number;
};
