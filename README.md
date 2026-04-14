# Fraud Lens

Multi-agent fraud detection pipeline built with TypeScript and Node.js.

## Scope

- No frontend
- No API server
- No database dependency for core scoring flow
- Terminal execution only

## Run

```bash
npx ts-node agents/index.ts
```

## Required environment variables

```bash
OPENAI_API_KEY=your_key_here
LANGFUSE_PUBLIC_KEY=your_key_here
LANGFUSE_SECRET_KEY=your_key_here
LANGFUSE_HOST=https://cloud.langfuse.com
```
