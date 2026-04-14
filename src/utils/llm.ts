export type LlmRequest = {
   prompt: string;
   model?: string;
};

export type LlmResponse = {
   content: string;
   promptTokens: number;
   completionTokens: number;
   totalTokens: number;
   estimatedCostUsd?: number;
};

export async function callLlm(_input: LlmRequest): Promise<LlmResponse> {
   // TODO: centralize all LLM calls here.
   throw new Error('callLlm is not implemented');
}
