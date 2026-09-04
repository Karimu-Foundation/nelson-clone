# Nelson Clone — web interface

A chat interface for the Nelson agent in this repository, plus a review panel
for judging its answers. Deployed on Vercel; runs anywhere Next.js runs.

## What it is for

The starter kit in the repository root is built for Claude Code, where the agent
reads `knowledge/` and `.claude/skills/` off disk. This app gives the same agent
a browser, so Nelson and Edu can use it without a terminal — and, more
importantly, can **see how each answer was produced** instead of only reading the
prose.

Every assistant message carries:

- **Grounding** — the ordered list of skills and knowledge files the agent
  actually retrieved for that answer. An answer with an empty trace is flagged,
  because for anything substantive that means it was not grounded in Karimu's
  knowledge base.
- **Run data** — model, context mode, effort, latency, time to first token,
  input/output/cache tokens, number of API calls, stop reason, and an estimated
  USD cost for that single answer.
- **Reasoning summary** — the model's summarised thinking, when the model
  supports it.
- **A scorecard** — 1-5 rating, a set of quality/failure flags ("invented
  facts", "generic NGO advice", "missed ops-history", "overstepped"), and free
  notes. Scores are kept in the reviewer's browser and can be exported as JSON.

## How the agent is wired

The three-layer pattern from the repository root is preserved, with retrieval
standing in for the filesystem:

| Layer | In Claude Code | In this app |
|---|---|---|
| Agent | `.claude/agents/nelson-agent.md` | the system prompt |
| Skills | 10 `SKILL.md` files, read on demand | a catalogue in the system prompt + the `load_skill` tool |
| Knowledge | `knowledge/*.md`, read with `Read`/`Grep` | a catalogue in the system prompt + the `read_knowledge` tool |

Two context modes:

- **Agentic (default)** — only the catalogues are preloaded; the agent calls
  `load_skill` / `read_knowledge` for what it needs. This mirrors how Agent
  Skills work, and it is what produces the grounding trace.
- **Full context** — all 10 skills and all 7 knowledge files (~85 KB, ~23K
  tokens) are inlined in the system prompt. One API call, lower latency, but no
  per-answer trace of what mattered.

The system prompt is sent with `cache_control: ephemeral`, so repeated turns read
the prefix from cache instead of paying full price for it.

The agent's own guardrails still apply: it drafts and recommends, it never
finalises anything external, and it cannot write files. Where the weekly loop
says to log a decision in `knowledge/ops-history.md`, it produces the entry to
paste and a human commits it.

## Knowledge base tab

Browses every knowledge file and skill the agent can see, rendered or as raw
markdown — so a reviewer can check an answer against the source without leaving
the app.

## Local development

```bash
cd web
npm install
cp .env.example .env.local   # then put a real ANTHROPIC_API_KEY in it
npm run dev
```

Open http://localhost:3000.

## Keeping the knowledge base in sync

`web/scripts/sync-kb.mjs` bundles `../.claude` and `../knowledge` into
`src/lib/kb.generated.ts` so the deployed app never touches the filesystem at
request time. It runs automatically on `npm run dev` and `npm run build`. After
editing anything in `knowledge/` or `.claude/`, commit both the source file and
the regenerated bundle — or just push, since the Vercel build regenerates it.

Do not edit `src/lib/kb.generated.ts` by hand.

## Deploying

The Vercel project's **root directory must be `web`**. The only required
environment variable is `ANTHROPIC_API_KEY`.

## Models

Opus 5 is the default — the judgement-heavy reasoning this agent is for. Sonnet 5
and Haiku 4.5 are selectable to compare answers and cost; Haiku is useful mainly
as a weak baseline. Sampling parameters (temperature and friends) are not
exposed because the 5-series models do not accept them.

## Access control

The knowledge base holds Karimu's real staff roster, financial figures and
personal details, so this app is not meant to be openly reachable. It ships with
a shared-password gate (`src/proxy.ts`) that **fails closed**: with no
`APP_ACCESS_PASSWORD` set, nothing is served — not the chat, not `/api/kb`.

Two required environment variables:

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Calls the Claude API. Without it the chat returns a clear error. |
| `APP_ACCESS_PASSWORD` | The shared password for the gate. Without it the whole app is closed. |

Set both in Vercel → Project → Settings → Environment Variables (all
environments), then redeploy. Signing in sets an HttpOnly cookie holding a
SHA-256 hash of the password — the password itself is never stored client-side.
To revoke access for everyone, change `APP_ACCESS_PASSWORD` and redeploy.

On a Vercel **Pro** plan you can instead use Vercel Authentication (Project →
Settings → Deployment Protection → All Deployments), which gates the app on
Vercel account membership rather than a shared password. That option is not
available for production deployments on the Hobby plan, which is why the
password gate exists. If you switch to it, delete `src/proxy.ts`,
`src/app/login/`, `src/app/api/access/` and `src/lib/access.ts`.
