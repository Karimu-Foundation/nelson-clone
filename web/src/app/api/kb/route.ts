import { KNOWLEDGE, SKILLS } from "@/lib/kb.generated";

export const runtime = "nodejs";

/**
 * Feeds the "Knowledge base" tab. Served from an API route (not imported into
 * the page) so the 85 KB corpus never ships in the client bundle — it is
 * fetched once, on demand, when the tab is opened.
 */
export function GET() {
  return Response.json({
    skills: SKILLS.map((s) => ({
      id: s.id,
      path: s.path,
      description: s.description,
      body: s.body,
    })),
    knowledge: KNOWLEDGE.map((k) => ({
      id: k.id,
      path: k.path,
      body: k.body,
    })),
  });
}
