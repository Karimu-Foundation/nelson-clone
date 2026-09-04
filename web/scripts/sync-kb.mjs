/**
 * Bundles the agent definition, the 10 skills and the knowledge/ files into a
 * single TypeScript module so the deployed app never touches the filesystem at
 * request time (and works the same locally and on Vercel).
 *
 * Run it whenever anything under ../knowledge or ../.claude changes:
 *   npm run sync-kb
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(here, "..");
const repoRoot = path.resolve(webRoot, "..");
const outFile = path.join(webRoot, "src", "lib", "kb.generated.ts");

const agentFile = path.join(repoRoot, ".claude", "agents", "nelson-agent.md");
const skillsDir = path.join(repoRoot, ".claude", "skills");
const knowledgeDir = path.join(repoRoot, "knowledge");
const glossaryFile = path.join(repoRoot, "GLOSSARY.md");

if (!fs.existsSync(agentFile) || !fs.existsSync(knowledgeDir)) {
  if (fs.existsSync(outFile)) {
    console.warn(
      "[sync-kb] source files not found — keeping the existing kb.generated.ts",
    );
    process.exit(0);
  }
  console.error(
    "[sync-kb] source files not found and no kb.generated.ts to fall back on.",
  );
  process.exit(1);
}

/** Splits `---\nkey: value\n---\nbody` into { meta, body }. */
function parseFrontmatter(raw) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw);
  if (!match) return { meta: {}, body: raw.trim() };
  const meta = {};
  let key = null;
  for (const line of match[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)$/.exec(line);
    if (kv) {
      key = kv[1];
      meta[key] = kv[2].trim();
    } else if (key && line.trim()) {
      // folded multi-line value
      meta[key] = `${meta[key]} ${line.trim()}`.trim();
    }
  }
  return { meta, body: raw.slice(match[0].length).trim() };
}

const agent = parseFrontmatter(fs.readFileSync(agentFile, "utf8"));

const skills = fs
  .readdirSync(skillsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => {
    const file = path.join(skillsDir, d.name, "SKILL.md");
    if (!fs.existsSync(file)) return null;
    const { meta, body } = parseFrontmatter(fs.readFileSync(file, "utf8"));
    return {
      id: meta.name || d.name,
      description: meta.description || "",
      body,
      path: `.claude/skills/${d.name}/SKILL.md`,
    };
  })
  .filter(Boolean)
  .sort((a, b) => a.id.localeCompare(b.id));

const knowledge = fs
  .readdirSync(knowledgeDir)
  .filter((f) => f.endsWith(".md"))
  .map((f) => ({
    id: f.replace(/\.md$/, ""),
    path: `knowledge/${f}`,
    body: fs.readFileSync(path.join(knowledgeDir, f), "utf8").trim(),
  }))
  .sort((a, b) => a.id.localeCompare(b.id));

if (fs.existsSync(glossaryFile)) {
  knowledge.unshift({
    id: "glossary",
    path: "GLOSSARY.md",
    body: fs.readFileSync(glossaryFile, "utf8").trim(),
  });
}

/** First `## What it does` / `## When to use` pair, for the skill catalogue. */
function firstParagraph(body) {
  const lines = body.split(/\r?\n/).filter((l) => l.trim() && !l.startsWith("#"));
  return lines[0] ?? "";
}

const module = `// GENERATED FILE — do not edit by hand.
// Produced by web/scripts/sync-kb.mjs from ../.claude and ../knowledge.
// Regenerate with: npm run sync-kb

export type Skill = {
  id: string;
  description: string;
  summary: string;
  path: string;
  body: string;
};

export type KnowledgeFile = {
  id: string;
  path: string;
  body: string;
};

export const AGENT_BODY = ${JSON.stringify(agent.body)};

export const AGENT_DESCRIPTION = ${JSON.stringify(agent.meta.description || "")};

export const SKILLS: Skill[] = ${JSON.stringify(
  skills.map((s) => ({
    id: s.id,
    description: s.description,
    summary: firstParagraph(s.body),
    path: s.path,
    body: s.body,
  })),
  null,
  2,
)};

export const KNOWLEDGE: KnowledgeFile[] = ${JSON.stringify(knowledge, null, 2)};

export const SKILL_IDS = SKILLS.map((s) => s.id);
export const KNOWLEDGE_IDS = KNOWLEDGE.map((k) => k.id);

export function getSkill(id: string): Skill | undefined {
  return SKILLS.find((s) => s.id === id);
}

export function getKnowledge(id: string): KnowledgeFile | undefined {
  const key = id.replace(/^knowledge\\//, "").replace(/\\.md$/, "");
  return KNOWLEDGE.find((k) => k.id === key);
}
`;

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, module);

const bytes = knowledge.reduce((n, k) => n + k.body.length, 0);
console.log(
  `[sync-kb] ${skills.length} skills, ${knowledge.length} knowledge files ` +
    `(${(bytes / 1024).toFixed(0)} KB) -> src/lib/kb.generated.ts`,
);
