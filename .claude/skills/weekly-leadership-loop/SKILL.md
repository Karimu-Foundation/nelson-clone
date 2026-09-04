---
name: weekly-leadership-loop
description: Models Karimu's weekly Leadership Team meeting as a repeatable prep-decide-log loop (pre-read, agenda, human-run meeting, decision capture, ops-history logging, follow-up drafts). Use when preparing for, running the record of, or following up on the weekly Leadership Team meeting, or when a recurring status/decision cadence needs structure.
---

# Skill: weekly-leadership-loop

## What it does
Models Karimu's actual operating rhythm — the weekly Leadership Team meeting Nelson chairs — as a repeatable loop the agent can help prepare for, run, and follow up on, the same way a marketing team would run a weekly campaign-review loop.

## Why this matters
Without a consistent loop, status reviews are ad hoc, decisions don't get logged, and the same questions/proposals resurface every few weeks because nobody remembers they were already settled. The loop only works if step 7 (log it) actually happens.

## The weekly loop (9 steps)
1. **Pull status across pillars/wards.** Agent reads `knowledge/org-profile.md`, latest dashboards/reports, and `knowledge/ops-history.md` to draft a pre-read: what's on track, what's at risk, what's new since last week.
2. **Surface decisions that need the Leadership Team.** Anything hitting a checkpoint in `risk-escalation` gets flagged for the agenda, not decided by the agent alone.
3. **Draft the agenda.** Order by urgency (government/community-facing deadlines first), grouped by pillar/ward.
4. **Checkpoint — human review of the pre-read and agenda.** Nelson/Leadership Team review before the meeting; nothing gets presented as settled until they've seen it.
5. **Meeting happens (human-run).** The agent is not in the room — its job is prep and follow-up, not running the meeting itself.
6. **Capture decisions and action items.** After the meeting, the agent turns notes into a clear record: what was decided, who owns follow-up, by when.
7. **Log to `knowledge/ops-history.md`.** Every decision, experiment, or notable status change from the meeting gets a row — this is what makes next week's pre-read sharper than this week's.
8. **Draft follow-up communications.** Volunteer asks, donor updates, partner replies — using `communication-style` and `donor-grants`/`volunteer-coordination` skills as appropriate. These go out as drafts for approval, not sent directly.
9. **Loop back.** Next week's pre-read starts from this week's log — the agent should visibly reference last week's open items rather than starting fresh each time.

## Operating principles
01. **Checkpoints 4 and 5 are human-owned.** The agent prepares and follows up; it never represents a decision as made until a human has actually made it.
02. **Skipping step 7 breaks the loop.** If ops-history isn't updated, next week's prep quality degrades immediately — treat logging as a required step, not optional hygiene.
03. **Recurring open items get called out, not silently re-listed.** If the same risk/decision has appeared three weeks running unresolved, say so explicitly rather than presenting it as new.

## Useful prompts to try
- "Draft this week's Leadership Team pre-read from `knowledge/` and `ops-history.md`."
- "Here are my meeting notes — turn them into decisions + action items and draft the ops-history.md entries."
