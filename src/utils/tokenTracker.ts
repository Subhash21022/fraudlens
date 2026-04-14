export type TokenUsageSnapshot = {
   promptTokens: number;
   completionTokens: number;
   totalTokens: number;
   estimatedCostUsd: number;
};

export function resetTokenTracker(): void {
   // TODO: reset per-run token counters.
   throw new Error('resetTokenTracker is not implemented');
}

export function recordTokenUsage(
   _promptTokens: number,
   _completionTokens: number,
   _estimatedCostUsd = 0
): TokenUsageSnapshot {
   // TODO: track cumulative token usage and cost.
   throw new Error('recordTokenUsage is not implemented');
}

export function getTokenUsageSnapshot(): TokenUsageSnapshot {
   // TODO: return cumulative token usage and cost.
   throw new Error('getTokenUsageSnapshot is not implemented');
}
