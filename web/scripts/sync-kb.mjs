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
const knowledgeDir = path.join(repoRoot, "public-knowledge");
const glossaryFile = path.join(repoRoot, "GLOSSARY.md");

/**
 * The private layer. PRIVATE_KB_DIR points at a checkout of the private
 * knowledge repository; when it is set, a file there replaces the public file of
 * the same name outright (it is the fuller version, not a supplement). Without
 * it — a fork, or a local checkout with no access — the public, annual-report
 * layer is what the agent gets, and everything still runs.
 */
// npm scripts do not load .env.local — Next.js does that for the app, not for a
// pre-build script. Read it here so PRIVATE_KB_DIR can live in one obvious file
// instead of having to be exported in every shell that runs a build.
const envFile = path.join(webRoot, ".env.local");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!m) continue;
    const value = m[2].trim().replace(/^["']|["']$/g, "");
    if (value && process.env[m[1]] === undefined) process.env[m[1]] = value;
  }
}

const privateRoot = process.env.PRIVATE_KB_DIR?.trim();
// Resolved against the repository root, not the working directory, so the same
// value works whether the build runs from web/ or from the repo root. Absolute
// paths are passed through unchanged.
const privateBase = privateRoot ? path.resolve(repoRoot, privateRoot) : null;
const privateDir = privateBase
  ? path.join(privateBase, "private-knowledge")
  : null;
const privateGlossary = privateBase
  ? path.join(privateBase, "GLOSSARY.md")
  : null;

if (privateRoot && !fs.existsSync(privateDir)) {
  console.error(
    `[sync-kb] PRIVATE_KB_DIR="${privateRoot}" resolves to ${privateBase}, but ${privateDir} does not exist.`,
  );
  process.exit(1);
}

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

/** Public file, unless the private layer carries one by the same name. */
function resolveKnowledge(name) {
  const priv = privateDir ? path.join(privateDir, name) : null;
  if (priv && fs.existsSync(priv)) {
    return { file: priv, path: `private-knowledge/${name}`, private: true };
  }
  return {
    file: path.join(knowledgeDir, name),
    path: `public-knowledge/${name}`,
    private: false,
  };
}

const names = new Set(fs.readdirSync(knowledgeDir).filter((f) => f.endsWith(".md")));
if (privateDir) {
  for (const f of fs.readdirSync(privateDir)) {
    if (f.endsWith(".md")) names.add(f);
  }
}

let overridden = 0;
const knowledge = [...names]
  .sort((a, b) => a.localeCompare(b))
  .map((f) => {
    const src = resolveKnowledge(f);
    if (src.private) overridden++;
    return {
      id: f.replace(/\.md$/, ""),
      path: src.path,
      body: fs.readFileSync(src.file, "utf8").trim(),
    };
  });

const glossary =
  privateGlossary && fs.existsSync(privateGlossary) ? privateGlossary : glossaryFile;
if (fs.existsSync(glossary)) {
  knowledge.unshift({
    id: "glossary",
    path: path.basename(glossary),
    body: fs.readFileSync(glossary, "utf8").trim(),
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
    `(${(bytes / 1024).toFixed(0)} KB) -> src/lib/kb.generated.ts` +
    (privateDir
      ? ` — private layer ON, ${overridden} file(s) from ${privateDir}`
      : " — private layer OFF (public annual-report knowledge only)"),
);
