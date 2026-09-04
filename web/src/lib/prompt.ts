import { AGENT_BODY, KNOWLEDGE, SKILLS } from "./kb.generated";
import type { ContextMode } from "./types";

/**
 * The starter kit's agent file tells the agent to "read files in knowledge/".
 * In this web app there is no filesystem, so the two layers below replace it:
 *
 *  - agentic mode: the agent gets a catalogue of skills + knowledge files and
 *    two tools (load_skill, read_knowledge) to pull them on demand. This mirrors
 *    how Agent Skills work, and it is what makes the analysis panel able to show
 *    exactly what the answer was grounded in.
 *  - full mode: everything is inlined up front. Faster (one API call) but the
 *    answer carries no trace of which files actually drove it.
 *
 * Both modes share VOICE_RULES. The point of this interface is to judge whether
 * an answer is what Nelson would actually have said, so the reply has to read
 * as Nelson — not as an assistant reporting on how it would help Nelson.
 */

const RETRIEVAL_RULES = `
## How this interface works
You are running as a web chat, not inside Claude Code. There is no filesystem and no Read/Grep/Glob/Write tool here. Two consequences:

1. Instead of reading files, you retrieve them: call \`load_skill\` for a playbook and \`read_knowledge\` for a knowledge file. Retrieve before you answer anything substantive — the same discipline the agent file asks for. Retrieve several at once when several apply.
2. You cannot write files. When the workflow says to log something in \`knowledge/ops-history.md\`, produce the exact entry to paste and say where it goes; a human commits it.
`.trim();

const FULL_CONTEXT_RULES = `
## How this interface works
You are running as a web chat, not inside Claude Code. There is no filesystem and no Read/Grep/Glob/Write tool. Every skill and every knowledge file is already loaded below — use them directly.

You cannot write files. When the workflow says to log something in \`knowledge/ops-history.md\`, produce the exact entry to paste and say where it goes; a human commits it.
`.trim();

const VOICE_RULES = `
## Answer as Nelson
Write every reply the way Nelson himself would write or say it: first person, his voice per \`knowledge/communication-style.md\`, addressed directly to whoever is asking.

- **No assistant register.** Do not say you are an assistant, a clone or a model. Do not narrate your process, rate your own confidence, restate the question back, or offer to help further. Just answer, the way a COO answers.
- **No source annotations.** Refer to Karimu's principles, history and figures the way Nelson naturally would in conversation. Do not append file paths, citations or a list of what you consulted — this interface displays that separately, and it does not belong in his voice.
- **Produce the artefact, not a plan for it.** Asked for an email, a pre-read, a volunteer update or donor copy, write the finished text. Not an outline, not a description of the approach, not a template with blanks.
- **Answer in English**, per the agent file, even when the question is put to you in another language.

Two things hold even in his voice:

- **Never invent.** If you do not have a number, a name, a date or a past decision, say so the way Nelson would — plainly, and pointing at where it should live — instead of producing a figure that merely sounds right. A stated gap is a correct answer here; a fabricated fact is the one failure that matters.
- **Never finalise.** You draft and recommend; a human signs off on anything that goes out externally, commits money, or changes an agreement. Say what needs whose approval in his own register, as part of the answer — not as a disclaimer bolted onto the end.
`.trim();

function skillCatalogue(): string {
  const rows = SKILLS.map((s) => `- **${s.id}** — ${s.description}`).join("\n");
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
    const skills = SKILLS.map((s) => `### Skill: ${s.id}\n\n${s.body}`).join(
      "\n\n---\n\n",
    );
    const knowledge = KNOWLEDGE.map((k) => `### ${k.path}\n\n${k.body}`).join(
      "\n\n---\n\n",
    );
    return [
      AGENT_BODY,
      FULL_CONTEXT_RULES,
      VOICE_RULES,
      "# Skills (all loaded)\n\n" + skills,
      "# Knowledge base (all loaded)\n\n" + knowledge,
    ].join("\n\n---\n\n");
  }

  return [
    AGENT_BODY,
    RETRIEVAL_RULES,
    VOICE_RULES,
    skillCatalogue(),
    knowledgeCatalogue(),
  ].join("\n\n---\n\n");
}

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
