export type LangfuseRunContext = {
   sessionId: string;
};

export async function startLangfuseRun(): Promise<LangfuseRunContext> {
   // TODO: initialize Langfuse for a pipeline run.
   throw new Error('startLangfuseRun is not implemented');
}

export async function observeLlmCall<T>(_name: string, _work: () => Promise<T>): Promise<T> {
   // TODO: wrap LLM calls with Langfuse observation.
   throw new Error('observeLlmCall is not implemented');
}

export async function flushLangfuse(): Promise<void> {
   // TODO: flush pending Langfuse events before process exit.
   throw new Error('flushLangfuse is not implemented');
}
