---
name: risk-escalation
description: Defines exactly what the agent must never finalize on its own and where it routes instead — the guardrail skill every other skill defers to. Use before anything external goes out (donor/funder replies, public content, budget commitments, MOU changes) or whenever it's unclear if something needs human sign-off.
---

# Skill: risk-escalation

## What it does
Defines exactly what the agent must never finalize on its own, and where it routes instead. This is the guardrail skill — every other skill defers to it when in doubt.

## Always requires human approval before anything happens
- Any external commitment: donor/funder replies that promise money, terms, or timelines; partnership agreements; government correspondence.
- Any public-facing content: social media, website, annual report copy, press statements.
- Any budget allocation, transfer, or grant acceptance/decline.
- Any change to a community agreement (MOU) or project scope/timeline.
- Anything involving a named individual's compensation, performance, health, or personal situation (staff or volunteer).
- Any message sent broadly to the volunteer base (15 countries) or to the Tanzanian Board.
- Any claim of a new efficiency/impact statistic not already documented in the knowledge base.

## Route to the right human/body
- **Legal, regulatory, or genuinely new/first-time culturally-sensitive matters (Tanzania)** → Tanzanian Board of Directors. Per the Annual Report, the Board ensures Karimu conforms with Tanzanian laws and regulations, helps staff with critical issues, and advises the COO on culturally-sensitive matters. Reserve this route for matters that are actually new territory, not for repeat/already-validated activity that happens to touch culturally-sensitive ground.
- **Strategic direction, major new initiatives** → Executive Team.
- **Day-to-day operational decisions, volunteer coordination, program status** → Nelson (COO) directly, via the weekly Leadership Team loop or async as needed.
- **Financial approval** → Treasurer / Executive Team per Karimu's financial-oversight norms.

## Inform vs. approve — don't collapse these into one thing
Not everything that reaches the Leadership Team is there for a vote. The Annual
Report describes the Leadership Team as meeting weekly to "review projects,
evaluate success metrics, discuss issues, and advise the COO" — advising, not
gating. Before telling the user "this needs Leadership Team/Board approval," ask
which bucket the decision is in: a repeat of something already validated and
low-cost, or something new, costly or externally binding. Only the latter clearly
needs formal sign-off; the former gets briefed, not gated.

How this splits in practice at Karimu specifically is recorded in
`escalation-practice.md` in the private knowledge base — read it before applying
the routing above to a real decision.

## How the agent should behave at these boundaries
01. **Prepare the full analysis, then stop for genuinely new/risky decisions.** Do the research, apply the decision checklist, draft the language — present it as "ready for your review," never as done, when the decision is new or materially risky. For a decision Nelson would own directly (see above), present it as a briefing/heads-up instead of implying it's pending approval.
02. **Say explicitly what kind of input is needed and from whom** — approval, or just awareness — using the routing and inform-vs-approve distinction above, rather than a generic "let me know what you think" or an over-formal "awaiting sign-off" when none is actually expected.
03. **If genuinely uncertain whether something needs escalation, escalate.** The cost of an unnecessary check-in is much lower than the cost of an unauthorized external commitment. This still applies fully to anything new, costly, or externally binding.
04. **Never soften this into "I'll just send a draft version."** A draft sent to the actual recipient is not a draft — if the recipient is external, nothing goes out until approved.

## Useful prompts to try
- "Does [proposed action] need escalation, and if so to whom?"
- "Before I send this, run it through risk-escalation and tell me what's blocking."
