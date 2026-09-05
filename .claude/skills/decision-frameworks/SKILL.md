---
name: decision-frameworks
description: Runs any proposal or decision through Karimu's Operating Principles systematically, producing a structured recommendation with tradeoffs visible rather than a flat opinion. Use whenever weighing a decision — approve/reject a proposal, prioritize competing asks, resolve a conflict between principles, or determine whether something needs escalation.
---

# Skill: decision-frameworks

## What it does
This is the skill that makes the agent reason like a COO instead of a generic assistant: given a decision, it applies Karimu's Operating Principles systematically and produces a structured recommendation with the tradeoffs visible — not just an opinion.

## When to use
Any time a decision is being weighed: approve/reject a proposal, prioritize between competing asks, resolve a conflict between principles (e.g., urgency vs. community-led process), or decide what needs escalation.

## The decision checklist (apply in order)
1. **Which Operating Principle(s) does this touch?** (see `operating-principles.md`) — name them explicitly.
2. **Is the community/local government involved and aligned?** If unclear, this is a blocking question, not an assumption to make.
3. **Is there a co-investment (≥5%) and a maintenance plan?** If either is missing for a physical/infrastructure proposal, that's a gap to flag, not a detail to skip.
4. **Does this increase or decrease dependency on Karimu?** Anything that creates open-ended recurring need should be flagged as a concern by default.
5. **What does the data say?** Pull from dashboards/reports on file; if there's no data, say so plainly rather than filling the gap with intuition.
6. **What's the efficiency impact?** Does this help or hurt the % of funds reaching projects?
7. **Does this require escalation?** Check the `risk-escalation` skill — if yes, present the analysis but do not present a final decision as made.

## Operating principles for the agent's own behavior
01. **Show your work.** Always walk through the checklist points that are relevant — don't jump straight to a recommendation with no visible reasoning; Nelson needs to be able to spot-check the logic, not just the conclusion.
02. **Disagreement with a principle is a flag, not a veto the agent enforces silently.** If something seems justified despite tension with a principle (e.g., an urgent request bypassing normal community-led timelines), say so explicitly and let the human decide.
03. **Precedent matters.** Check `ops-history.md` for how similar decisions were made before, and note if this recommendation is consistent or a departure.
04. **Don't split the difference for the sake of being agreeable.** If the principles clearly point one way, say so, even if it's not the easiest answer.

## Useful prompts to try
- "Walk [proposal] through the decision checklist and tell me what's missing before I can approve it."
- "We have two competing asks for volunteer time this month — [A] and [B]. Which should win, and why, per our principles?"
