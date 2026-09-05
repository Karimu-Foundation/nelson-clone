# Setup — Claude Code (terminal)

1. Download and unzip this starter kit.
2. Open a terminal in the unzipped `nelson-agent-starter/` folder.
3. Run `claude` (or `claude code`, depending on your install) from that folder — Claude Code automatically picks up `.claude/agents/nelson-agent.md` and `.claude/skills/`.
4. Before doing any real work, review and edit the files in `public-knowledge/` — especially the `> TODO` notes at the end of each file.
5. Run the smoke test from `README.md`.
6. As you use it, update `public-knowledge/ops-history.md` after any real decision, and correct any other knowledge file the moment you notice it's wrong or stale — treat these files as living documents, not one-time setup.

No API keys or external accounts are required for this starter — it works purely on the knowledge files and skills. If you later want to connect live data (CRM, project dashboards, fundraising platform), that would be a new skill (e.g. `data-integration/SKILL.md`) added alongside the existing ones, following the same pattern as the existing skills.
