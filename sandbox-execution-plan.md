# Sandbox Execution Plan

This file is the working checklist for building the Reply Mirror sandbox solution
from the current state of the repo.

## Current State

- Raw sandbox data exists in:
  - `data/raw/public_lev_1/`
  - `data/raw/public_lev_2/`
  - `data/raw/public_lev_3/`
- Cleaned event JSON has already been generated in:
  - `data/cleaned/public_lev_1/monitoring-events.json`
  - `data/cleaned/public_lev_2/monitoring-events.json`
  - `data/cleaned/public_lev_3/monitoring-events.json`
- Agent scaffold exists in:
  - `src/modules/agent/`
- Prompt/util scaffolds exist in:
  - `src/prompts/`
  - `src/utils/`

## Goal

Build a TypeScript agentic system that:

1. reads cleaned monitoring events
2. performs investigator analysis
3. lets the LLM make the central preventive-support decision
4. writes the final output `.txt`
5. tracks the run with Langfuse

## Step 1: Make The Pipeline Runnable

Files:
- `src/modules/agent/index.ts`
- `package.json`

Tasks:
- load one cleaned JSON file from `data/cleaned/public_lev_x/monitoring-events.json`
- iterate through the events
- call placeholder investigator/decider/writer functions
- make `pnpm agent:run` execute end-to-end

Definition of done:
- the script runs without HTTP/API usage
- it can process a dataset file without crashing

## Step 2: Implement The Writer

Files:
- `src/modules/agent/agent.writer.ts`
- `output/`

Tasks:
- write a plain text output file
- include one `citizenId` per line
- include only cases with `activate_support`
- use deterministic file naming, for example:
  - `output/public_lev_1.txt`

Definition of done:
- one command produces a valid submission-style text file

## Step 3: Implement A Minimal Investigator

Files:
- `src/modules/agent/agent.investigator.ts`

Tasks:
- create deterministic risk indicators from:
  - activity
  - sleep
  - environmental exposure
  - recent deltas/trends
  - location summary
- return:
  - `riskScore`
  - `riskIndicators`
  - `shouldEscalateToDecider`

Important:
- this logic should help the LLM
- it must not become the real final decision-maker

Definition of done:
- each event gets a structured pre-analysis payload

## Step 4: Implement The Prompt Builder

Files:
- `src/prompts/preventiveSupport.ts`

Tasks:
- convert one event + investigator result into a strict prompt
- require a structured answer format
- keep the LLM focused on:
  - preventive support needed or not
  - confidence
  - one short reason

Definition of done:
- prompt is stable and reusable for all levels

## Step 5: Implement The LLM Wrapper

Files:
- `src/utils/llm.ts`
- `src/config.ts`

Tasks:
- connect to OpenRouter
- use env config:
  - `OPENROUTER_API_KEY`
  - `OPENROUTER_MODEL`
- centralize every LLM call in one place

Definition of done:
- `agent.decider.ts` can call one shared LLM helper

## Step 6: Implement Langfuse Tracking

Files:
- `src/utils/langfuse.ts`
- `src/utils/llm.ts`

Tasks:
- initialize Langfuse with:
  - `LANGFUSE_PUBLIC_KEY`
  - `LANGFUSE_SECRET_KEY`
  - `LANGFUSE_HOST`
- generate one session ID per run
- ensure all LLM calls in the run are tracked under that session
- print the session ID clearly

Definition of done:
- every run has a session ID ready for submission

## Step 7: Implement The Decider

Files:
- `src/modules/agent/agent.decider.ts`

Tasks:
- take the event plus investigator output
- call the prompt builder
- call the shared LLM wrapper
- parse the response into:
  - `activate_support`
  - `continue_monitoring`
  - confidence
  - reasoning

Definition of done:
- the LLM is the central decision layer

## Step 8: Decide How Investigator And Decider Interact

Decision to make:

- Option A:
  - every event goes to the LLM
- Option B:
  - investigator marks some events as low-priority and passes a reduced-context path

Challenge note:
- the LLM must remain central enough to stay compliant
- do not let the deterministic layer replace the LLM entirely

Recommended approach:
- still call the LLM for all events at first
- optimize later only if token usage becomes a problem

## Step 9: Add Dataset Selection

Files:
- `src/modules/agent/index.ts`

Tasks:
- allow choosing which level to run:
  - `public_lev_1`
  - `public_lev_2`
  - `public_lev_3`
- accept a CLI argument or env variable

Definition of done:
- same code can run any sandbox level on demand

## Step 10: Produce First Real Sandbox Output

Tasks:
- run against `public_lev_1`
- generate the output text file
- inspect whether formatting matches the problem statement exactly

Definition of done:
- one upload-ready `.txt` exists for level 1

## Step 11: Test Against Training Slots

Tasks:
- upload output for training level 1
- inspect score
- repeat for levels 2 and 3
- improve investigator prompt/logic based on results

Definition of done:
- we have baseline training scores for all three levels

## Step 12: Prepare Evaluation Submission

Tasks:
- run the best version on evaluation data
- keep output files organized
- zip the source code
- include the Langfuse session ID

Definition of done:
- evaluation submission package is ready without missing pieces

## Immediate Next Move

The next implementation step should be:

1. make `src/modules/agent/index.ts` runnable
2. implement `agent.writer.ts`
3. then implement the first real `agent.investigator.ts`

That order gives a working path from input to output before we spend time on LLM behavior.
