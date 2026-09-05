# nelson-clone — a starter kit for building an AI-Brain

A working pattern for cloning one person's operational judgment into a Claude
agent: their organisation's real principles, structure, history and voice —
rather than generic advice from a model's training data.

It was built for Nelson Mattos, COO of the Karimu Foundation, and it ships here
with **Karimu's real, publicly-reported knowledge** — everything in
`public-knowledge/` is drawn from Karimu's published Annual Reports. Fork it,
replace those files with your own, and you have your own brain running the
same day.

```
nelson-clone/
├── .claude/
│   ├── agents/nelson-agent.md     # the orchestrator — the role, how it thinks and behaves
│   └── skills/                    # 10 specialised playbooks
│       ├── org-context/                  ├── decision-frameworks/
│       ├── volunteer-coordination/       ├── communication-style/
│       ├── program-oversight/            ├── weekly-leadership-loop/
│       ├── donor-grants/                 └── risk-escalation/
│       ├── partnership-management/
│       └── financial-oversight/
├── public-knowledge/              # what makes it about YOUR organisation
│   ├── org-profile.md             # mission, pillars, methodology, proof points
│   ├── team-structure.md          # governance, leadership, volunteer structure
│   ├── operating-principles.md    # the decision framework
│   ├── communication-style.md     # the person's voice, by audience
│   ├── nelson-background.md       # career arc, leadership philosophy, decision style
│   └── ops-history.md             # the log that makes the brain learn over time
├── web/                           # the chat + response-analysis interface
└── GLOSSARY.md
```

**10 skills · 6 knowledge files.** Everything is in English, on the assumption of
a volunteer base spread across many countries. The agent file and every skill use
Anthropic's Agent Skills spec (YAML frontmatter with `name` and a `description`
stating both what the skill does and when to use it), which is what lets Claude
discover and trigger the right skill from its description alone, without loading
the full file until it is needed.

## The three layers, and why they are separate

- **Agent** decides what applies and holds the conversation.
- **Skills** teach *how* to reason about one part of the job — volunteer
  coordination, program oversight, donor relations, decisions, escalation.
- **Knowledge** is what makes it about your organisation specifically. Facts come
  from here, never from the model's general knowledge.

Change your org structure? Edit `public-knowledge/team-structure.md` and all ten skills
adapt. Change a decision principle? Edit `public-knowledge/operating-principles.md`, not
each skill in turn.

## Two ways to use it

**1. Claude Code / Claude Cowork** — open this folder and the agent picks up
`.claude/agents/nelson-agent.md` and `.claude/skills/` automatically. See
`SETUP.md` (terminal) or `COWORK_SETUP.md` (desktop app). No API key needed.

**2. The web interface (`web/`)** — a browser chat with the same agent, plus a
review panel that shows, for every answer, which skills and knowledge files it
retrieved, what it cost, how long it took, and a scorecard for rating it. Built
for reviewing how faithfully the clone reasons, not just for reading what it
says. Deploys on Vercel; needs an `ANTHROPIC_API_KEY`. See
[`web/README.md`](web/README.md).

Both surfaces read the same `public-knowledge/` and `.claude/skills/` files — the web app
bundles them at build time via `web/scripts/sync-kb.mjs`. Edit once, both change.

## ⚠️ Keeping your real knowledge private

**The knowledge in this repository is the published half. Yours will have another half.**

A knowledge base that is actually useful holds more than an organisation publishes:
unwritten decision heuristics, how people really write, who decides what, why a
project was killed, personal context about the person being cloned. That does not
belong in a public repository, and it does not belong in a repository other people
fork.

Karimu splits it in two, along a line that is **objective rather than a judgment
call**:

```
nelson-clone   (public)    the kit, plus public-knowledge/  — only what is in the published Annual Reports
karimu-brain   (private)   private-knowledge/               — everything else
```

The rule is: *"is this fact in a published Annual Report?"* If yes, it may live in
`public-knowledge/`. If no — if it came from a meeting, a message, a recording or
a conversation — it goes to the private repository. Nobody has to decide whether
something *feels* sensitive.

Two things make that hold:

1. **The ingestion pipeline only ever writes to the private repository.** The
   public layer is hand-written from published PDFs and changes when a new Annual
   Report comes out — roughly once a year. Nothing flows into it automatically.
2. **The private layer replaces, it does not merge.** A file in
   `private-knowledge/` supersedes the public file of the same name outright, so
   there is never a half-public, half-private document to keep in sync.

Wiring it up: set `PRIVATE_KB_DIR` to a checkout of the private repository and
`web/scripts/sync-kb.mjs` picks the private files up. Leave it unset — a fork, or
a contributor without access — and everything still runs on the public layer
alone. The agent is told which layer it has, and says so rather than inventing the
detail it is missing.

If you fork this, set up the split *before* you put anything real in
`public-knowledge/`. It is far easier than removing data from git history later.

## Getting started

1. Open this folder in Claude Code (terminal) or Claude Cowork (desktop app).
2. Replace every file in `public-knowledge/` with your own, and decide where your
   public/private line falls (see above). Each file ends with a `> TODO` block
   describing what actually matters in it — read those first.
3. Run the smoke test below.
4. Start using it for real work, and log decisions in `public-knowledge/ops-history.md`
   as you go. That log is what makes the brain sharpen over time instead of
   staying frozen at the day you set it up.

### Two rules worth keeping

`operating-principles.md` encodes two guardrails worth carrying into your own
version whatever your organisation does:

- **Never invent.** A stated gap ("I don't have that number, it should be in
  `org-profile.md`") is a correct answer. A plausible-sounding fabricated figure
  is the one failure that matters.
- **Never finalise.** The brain drafts and recommends. A human signs off on
  anything that goes out externally, commits money, or changes an agreement.

## Smoke test

Once you have replaced `public-knowledge/`, ask the agent:

> "Read all the files in public-knowledge/. Tell me what's solid, what's still a
> placeholder or assumption, and what's missing or too generic to be useful."

If it can name what is real versus assumed, and asks good follow-up questions, the
setup is working. If it gives a generic answer, the knowledge files need more real
detail.

Other prompts to try:
- "Walk me through the decision checklist for [a real situation you're facing]."
- "Draft this week's Leadership Team pre-read."
- "Draft a volunteer recognition message for [person/contribution]."
- "Does [proposed action] need escalation, and to whom?"

## Adding a skill

Give it the same shape as the existing ten: a `SKILL.md` with frontmatter
carrying `name` (lowercase-hyphenated, ≤64 chars) and `description` (what it does
*and* when to use it, ≤1024 chars), then the body.

## Where the knowledge came from

`public-knowledge/` was written from Karimu's 2023, 2024 and 2025 Annual Reports,
published at <https://karimufoundation.org/annual-reports>. Every file carries a
header stating that rule, so a contributor can check any claim against a public
PDF — and knows what may not be added.

## A note on scope

This kit deliberately has **no automation layer** into an organisation's own
systems — the `web/` interface is a front end for the agent, not an integration
with a CRM, dashboards or a fundraising platform. The work being cloned here —
decisions, coordination, communication, judgment — is not something to automate
end to end. The brain is built to think alongside a person and prepare drafts, not
to act on its own. `risk-escalation/SKILL.md` makes that explicit: nothing
external goes out without human sign-off.
