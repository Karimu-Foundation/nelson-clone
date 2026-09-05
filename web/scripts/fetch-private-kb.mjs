/**
 * Fetches the private knowledge layer at build time, if credentials exist.
 *
 * Runs before sync-kb.mjs on every build and is a deliberate no-op unless
 * KARIMU_BRAIN_TOKEN is set, so a fork, a local checkout, or a contributor
 * without access all still build fine on the public layer.
 *
 * It clones into `.private-kb/` at the repository root — sync-kb.mjs looks there
 * automatically, so nothing else needs configuring. One environment variable is
 * the whole setup.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");
const target = path.join(repoRoot, ".private-kb");

// Same .env.local read as sync-kb.mjs, so a local checkout is recognised and
// this script reports accurately instead of claiming credentials are missing.
const envFile = path.join(here, "..", ".env.local");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!m) continue;
    const value = m[2].trim().replace(/^["']|["']$/g, "");
    if (value && process.env[m[1]] === undefined) process.env[m[1]] = value;
  }
}

const REPO = "github.com/Karimu-Foundation/karimu-brain.git";

if (process.env.PRIVATE_KB_DIR?.trim()) {
  console.log("[fetch-private-kb] PRIVATE_KB_DIR is set — using that checkout.");
  process.exit(0);
}

const token = process.env.KARIMU_BRAIN_TOKEN?.trim();
if (!token) {
  console.log(
    "[fetch-private-kb] KARIMU_BRAIN_TOKEN not set — skipping. " +
      "The build will use the public annual-report knowledge only.",
  );
  process.exit(0);
}

fs.rmSync(target, { recursive: true, force: true });

try {
  execFileSync(
    "git",
    ["clone", "--depth", "1", "--quiet", `https://x-access-token:${token}@${REPO}`, target],
    { stdio: ["ignore", "inherit", "pipe"] },
  );
} catch (err) {
  // Never print the error body — it echoes the URL, and the URL carries the token.
  console.error(
    "[fetch-private-kb] clone failed. Check that KARIMU_BRAIN_TOKEN is a valid " +
      "fine-grained token with Contents: Read on Karimu-Foundation/karimu-brain " +
      "and has not expired. Exit code: " + (err.status ?? "unknown"),
  );
  process.exit(1);
}

const inner = path.join(target, "private-knowledge");
if (!fs.existsSync(inner)) {
  console.error(`[fetch-private-kb] cloned, but ${inner} is missing.`);
  process.exit(1);
}

const n = fs.readdirSync(inner).filter((f) => f.endsWith(".md")).length;
console.log(`[fetch-private-kb] private layer fetched — ${n} knowledge files.`);
