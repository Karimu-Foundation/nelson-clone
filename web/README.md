# Nelson Clone — web interface

A chat interface for the Nelson agent in this repository, plus a review panel
for judging its answers. Deployed on Vercel; runs anywhere Next.js runs.

## What it is for

The starter kit in the repository root is built for Claude Code, where the agent
reads `public-knowledge/` and `.claude/skills/` off disk. This app gives the same agent
a browser, so the team can use it without a terminal — and, more
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
| Knowledge | `public-knowledge/*.md`, read with `Read`/`Grep` | a catalogue in the system prompt + the `read_knowledge` tool |

The agent answers **in Nelson's own first person**, as he would write it — no
assistant register, no process narration, no source annotations in the prose,
and finished artefacts (the actual email, the actual pre-read) rather than
outlines. That is deliberate: the question this interface exists to answer is
whether a reply is what Nelson would really have said, and that is only
judgeable if the reply is written as him. The two guardrails survive the voice
shift — he never invents a figure he does not have, and he never finalises
anything a human must sign off on.

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
says to log a decision in `public-knowledge/ops-history.md`, it produces the entry to
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
editing anything in `public-knowledge/` or `.claude/`, commit both the source file and
the regenerated bundle — or just push, since the Vercel build regenerates it.

Do not edit `src/lib/kb.generated.ts` by hand.

## Deploying

The Vercel project's **root directory must be `web`**. The only required
environment variable is `ANTHROPIC_API_KEY`.

## Models and effort

**Sonnet 5** is the default and **Haiku 4.5** the alternative. Opus-tier models
are deliberately not offered: a review session runs many turns over a large
cached system prompt, and Opus made that too expensive to use freely. The
restriction is enforced server-side, not just hidden in the picker — `getModel`
falls back to Sonnet, so a request naming any other model is served by Sonnet.

Effort defaults to **medium**; `low` through `max` remain selectable per turn
for Sonnet. Haiku takes neither `effort` nor adaptive thinking, so the picker
hides effort when it is selected and the request omits both fields.

Sampling parameters (temperature and friends) are not exposed, because the
5-series models reject them.

## Access control

A real knowledge base holds a named staff roster, financial figures and personal
details — this repository ships fictional examples, but the deployed app reads
the real thing — so this app is not meant to be openly reachable. It ships with
a shared-password gate (`src/proxy.ts`) that **fails closed**: with no
`APP_ACCESS_PASSWORD` set, nothing is served — not the chat, not `/api/kb`.

Two required environment variables:

| Variable | Required | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | yes | Calls the Claude API. Without it the chat returns a clear error. |
| `APP_ACCESS_PASSWORD` | yes | The shared password for the gate. Without it the whole app is closed. |
| `ANTHROPIC_WORKSPACE_ID` | sometimes | Only if the API key is **organisation-level** — a key not created inside a workspace. Such a key returns `400 … not scoped to a workspace` unless the request names one; setting this sends the `anthropic-workspace-id` header. Find it in Anthropic Console → Settings → Workspaces (starts with `wrkspc_`). Leave unset for a workspace-scoped key. |

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
