## RealFi Mini

Finance onboarding assistant prototype built with Next.js 15, LangGraph, and the Vercel AI SDK.

### Development

```bash
pnpm install
pnpm dev
```

The chatbot lives at [`/chat`](http://localhost:3000/chat). `/api/chat` now streams responses from a LangGraph ReAct agent powered by the private nilAI endpoint and tool calls that capture onboarding data.

### Environment

Copy `.env.example` to `.env.local` and update:

- `NEXT_PUBLIC_PRIVY_APP_ID`
- `DATABASE_URL`
- `NIL_AI_BASEURL` (e.g. `https://nilai-a779.nillion.network/v1/`)
- `NILLION_NILAI_API_KEY`

### Next Steps

- Wire Prisma/Postgres pointers that reference the stored NilDB record IDs.
- Expand tool catalog coverage (FAQ corpus, analytics events) and add golden-path evals.
- Harden guardrails and add CI checks before promoting to production.
