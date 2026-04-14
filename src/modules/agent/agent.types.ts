export type UserProfile = {
   citizenId: string;
   age?: number;
   gender?: string;
   region?: string;
   riskContext?: Record<string, unknown>;
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
};

export type MonitoringEventInput = {
   eventId: string;
   citizenId: string;
   eventType: string;
   physicalActivityIndex: number;
   sleepQualityIndex: number;
   environmentalExposureLevel: number;
   timestamp: string;
   user?: UserProfile;
   locationSummary?: LocationSummary;
   derivedSignals?: Record<string, unknown>;
};

export type InvestigationResult = {
   eventId: string;
   citizenId: string;
   riskScore: number;
   riskIndicators: string[];
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
