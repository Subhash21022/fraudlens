# Fraud Lens Roadmap

## Goal
Build a terminal-only TypeScript multi-agent fraud detection pipeline that:
- Reads `data/cleaned/transactions.json`
- Runs `Investigator -> Decider -> Writer`
- Tracks token usage and budget
- Integrates Langfuse tracing for all LLM calls
- Produces `output/results.txt` (fraud transaction IDs, one per line)

## Phase 1: Project Reset and Minimal Structure
1. Remove leftover API/server-specific files that are not needed for a script-only project.
2. Ensure root folders exist:
   - `agents/`
   - `prompts/`
   - `utils/`
   - `data/cleaned/`
   - `output/`
3. Update `package.json` scripts for script-first workflow:
   - `run`: `ts-node agents/index.ts`
4. Keep only required env vars in `.env`:
   - `OPENAI_API_KEY`
   - `LANGFUSE_PUBLIC_KEY`
   - `LANGFUSE_SECRET_KEY`
   - `LANGFUSE_HOST`

## Phase 2: Types and Input Validation
1. Create shared transaction types in `agents/types.ts` (or colocated in `agents/index.ts`).
2. Define and validate expected transaction shape for every record in `transactions.json`.
3. Add input guardrails:
   - skip/record malformed rows
   - log count of valid vs invalid rows

## Phase 3: Agent One (Investigator)
1. Implement rule-based scoring in `agents/investigator.ts` with no LLM usage.
2. Add red-flag extraction rules:
   - amount vs average spend ratio
   - unusual hour
   - card-not-present
   - distance jump
   - very new account
   - previous fraud flags
   - international context
3. Return:
   - `transactionId`
   - `suspicionScore` (0-100)
   - `redFlags[]`
4. Add threshold decision:
   - `< 25` => auto-legitimate (skip LLM)

## Phase 4: Prompt + Agent Two (Decider)
1. Create prompt builder in `prompts/fraudDetection.ts`.
2. Ensure strict output contract:
   - JSON only
   - `verdict: "fraud" | "legitimate"`
   - `confidence: 0-100`
   - `reasoning: one sentence`
3. Implement `agents/decider.ts`:
   - runs only when `suspicionScore >= 25`
   - calls central `utils/llm.ts`
   - parses and validates model JSON output
   - applies safe fallback if parse fails

## Phase 5: Token Tracking + LLM Wrapper
1. Implement `utils/tokenTracker.ts`:
   - running totals for prompt/completion/total tokens
   - optional estimated cost
   - budget warning threshold
2. Implement `utils/llm.ts`:
   - single entry point for all model calls
   - update token tracker on every call
   - log usage after every request
   - expose summary at run end

## Phase 6: Langfuse Integration
1. Implement `utils/langfuse.ts` with run/session initialization.
2. Wrap each LLM call with Langfuse observation/trace.
3. Print Langfuse session ID at run start for submission form.
4. Flush/close Langfuse client cleanly at run end.

## Phase 7: Agent Three (Writer)
1. Implement `agents/writer.ts`.
2. Collect all final fraud decisions.
3. Write `output/results.txt`:
   - fraud transaction IDs only
   - one ID per line
   - no extra text

## Phase 8: Orchestration Entry Point
1. Implement `agents/index.ts`:
   - load JSON transactions
   - process sequentially (or controlled concurrency if needed)
   - run Investigator first
   - gate Decider by threshold
   - aggregate final outcomes
   - call Writer at end
2. Add run summary logs:
   - total transactions
   - auto-legitimate count
   - LLM-reviewed count
   - fraud count
   - token/cost summary
   - Langfuse session ID

## Phase 9: Testing and Dry Runs
1. Add a small local sample dataset in `data/cleaned/transactions.json` for smoke tests.
2. Test no-LLM path (all scores < 25).
3. Test mixed path (some LLM calls, some skipped).
4. Validate final file format exactly for leaderboard rules.

## Phase 10: Submission Readiness
1. Run full dataset with production env keys.
2. Capture:
   - `output/results.txt`
   - Langfuse session ID
   - token/cost metrics
3. Submit to Reply leaderboard.

## Implementation Order (Small Steps)
1. Create folders + scripts + env cleanup.
2. Build Investigator.
3. Build prompt + Decider.
4. Build token tracker + LLM wrapper.
5. Add Langfuse tracing.
6. Build Writer.
7. Build orchestrator entrypoint.
8. Run smoke test and produce `output/results.txt`.
