import { AGENT_BODY, KNOWLEDGE, SKILLS } from "./kb.generated";
import type { ContextMode } from "./types";

/**
 * The starter kit's agent file tells the agent to "read files in knowledge/".
 * In this web app there is no filesystem, so the two layers below replace it:
 *
 *  - agentic mode: the agent gets a catalogue of skills + knowledge files and
 *    two tools (load_skill, read_knowledge) to pull them on demand. This mirrors
 *    how Agent Skills work in Claude Code, and it is what makes the analysis
 *    panel able to show exactly what the answer was grounded in.
 *  - full mode: everything is inlined up front. Faster (one API call) but the
 *    answer carries no trace of which files actually drove it.
 */

const HARNESS_RULES = `
## How this interface works
You are running as a web chat, not inside Claude Code. There is no filesystem and no Read/Grep/Glob/Write tool here. Two consequences:

1. Instead of reading files, you retrieve them: call \`load_skill\` for a playbook and \`read_knowledge\` for a knowledge file. Retrieve before you answer anything substantive — the same discipline the agent file asks for. Retrieve several at once when several apply.
2. You cannot write files. When the workflow says to log something in \`knowledge/ops-history.md\`, produce the exact entry to paste and say where it goes; a human commits it.

The people using this interface are Nelson and Edu, reviewing how well this clone reasons. So:
- If a question needs grounding you do not have, say which knowledge file should hold it and that it is missing or stale. Do not fill the gap with plausible-sounding NGO-management content — a visible gap is a useful result here, an invented figure is a failure.
- Keep the operating-principle checks and escalation calls explicit rather than implicit, so they can be judged.
- Answer in English, per the agent file, even when the question is asked in another language.
`.trim();

function skillCatalogue(): string {
  const rows = SKILLS.map(
    (s) => `- **${s.id}** — ${s.description}`,
  ).join("\n");
  return `## Skills available via \`load_skill\`\n${rows}`;
}

function knowledgeCatalogue(): string {
  const rows = KNOWLEDGE.map(
    (k) =>
      `- **${k.id}** (\`${k.path}\`, ~${Math.round(k.body.length / 1024)} KB)`,
  ).join("\n");
  return `## Knowledge files available via \`read_knowledge\`\n${rows}`;
}

export function buildSystemPrompt(mode: ContextMode): string {
  if (mode === "full") {
    const skills = SKILLS.map(
      (s) => `### Skill: ${s.id}\n\n${s.body}`,
    ).join("\n\n---\n\n");
    const knowledge = KNOWLEDGE.map(
      (k) => `### ${k.path}\n\n${k.body}`,
    ).join("\n\n---\n\n");
    return [
      AGENT_BODY,
      HARNESS_RULES_FULL,
      "# Skills (all loaded)\n\n" + skills,
      "# Knowledge base (all loaded)\n\n" + knowledge,
    ].join("\n\n---\n\n");
  }

  return [
    AGENT_BODY,
    HARNESS_RULES,
    skillCatalogue(),
    knowledgeCatalogue(),
  ].join("\n\n---\n\n");
}

const HARNESS_RULES_FULL = `
## How this interface works
You are running as a web chat, not inside Claude Code. There is no filesystem and no Read/Grep/Glob/Write tool. Every skill and every knowledge file is already loaded below — use them directly, and cite the file you are relying on (e.g. "per \`knowledge/operating-principles.md\`") so your grounding is reviewable.

You cannot write files. When the workflow says to log something in \`knowledge/ops-history.md\`, produce the exact entry to paste and say where it goes; a human commits it.

The people using this interface are Nelson and Edu, reviewing how well this clone reasons. So:
- If the knowledge base does not cover something, say which file should hold it and that it is missing or stale. Do not fill the gap with generic NGO-management content.
- Keep operating-principle checks and escalation calls explicit rather than implicit.
- Answer in English, per the agent file, even when the question is asked in another language.
`.trim();

/** Rough token estimate for display only (~3.7 chars/token on this corpus). */
export function approxTokens(text: string): number {
  return Math.round(text.length / 3.7);
}

export const TOOLS = [
  {
    name: "load_skill",
    description:
      "Load the full text of one of Nelson's COO playbooks (an Agent Skill). Call this before reasoning about the part of the job it covers, exactly as you would open the SKILL.md file in Claude Code.",
    input_schema: {
      type: "object" as const,
      properties: {
        skill: {
          type: "string",
          enum: SKILLS.map((s) => s.id),
          description: "The skill id to load.",
        },
      },
      required: ["skill"],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    name: "read_knowledge",
    description:
      "Read one of Karimu's knowledge files in full — org profile, team structure, operating principles, communication style, Nelson's background, or the ops-history log. Use this for any question touching a pillar, a person, a number, or a past decision, instead of guessing.",
    input_schema: {
      type: "object" as const,
      properties: {
        file: {
          type: "string",
          enum: KNOWLEDGE.map((k) => k.id),
          description: "The knowledge file id to read.",
        },
      },
      required: ["file"],
      additionalProperties: false,
    },
    strict: true,
  },
];
