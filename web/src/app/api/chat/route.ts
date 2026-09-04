import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

import { getKnowledge, getSkill } from "@/lib/kb.generated";
import {
  DEFAULT_EFFORT,
  DEFAULT_MODEL,
  EFFORT_LEVELS,
  estimateCost,
  getModel,
  type Effort,
} from "@/lib/models";
import { approxTokens, buildSystemPrompt, TOOLS } from "@/lib/prompt";
import type { ContextMode, StreamEvent, ToolTrace, Usage } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_TOOL_ROUNDS = 8;

type Body = {
  messages?: { role: "user" | "assistant"; content: string }[];
  model?: string;
  mode?: ContextMode;
  effort?: Effort;
  maxTokens?: number;
};

/** Runs one tool call and returns the text to hand back to the model. */
function runTool(name: string, input: unknown): {
  content: string;
  target: string;
  ok: boolean;
  detail?: string;
} {
  const args = (input ?? {}) as Record<string, unknown>;

  if (name === "load_skill") {
    const id = String(args.skill ?? "");
    const skill = getSkill(id);
    if (!skill) {
      return {
        content: `No skill named "${id}". Call load_skill again with one of the ids listed in the system prompt.`,
        target: id,
        ok: false,
        detail: "unknown skill",
      };
    }
    return {
      content: `# ${skill.path}\n\n${skill.body}`,
      target: skill.id,
      ok: true,
    };
  }

  if (name === "read_knowledge") {
    const id = String(args.file ?? "");
    const file = getKnowledge(id);
    if (!file) {
      return {
        content: `No knowledge file named "${id}". Call read_knowledge again with one of the ids listed in the system prompt.`,
        target: id,
        ok: false,
        detail: "unknown file",
      };
    }
    return {
      content: `# ${file.path}\n\n${file.body}`,
      target: file.id,
      ok: true,
    };
  }

  return {
    content: `Unknown tool "${name}".`,
    target: name,
    ok: false,
    detail: "unknown tool",
  };
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      {
        error:
          "ANTHROPIC_API_KEY is not set on the server. Add it in Vercel → Project → Settings → Environment Variables (or in web/.env.local for local development) and redeploy.",
      },
      { status: 500 },
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const history = (body.messages ?? []).filter(
    (m) => typeof m.content === "string" && m.content.trim().length > 0,
  );
  if (history.length === 0) {
    return Response.json({ error: "No messages provided." }, { status: 400 });
  }

  const model = getModel(body.model ?? DEFAULT_MODEL);
  const mode: ContextMode = body.mode === "full" ? "full" : "agentic";
  const effort: Effort | null = model.supportsEffort
    ? EFFORT_LEVELS.includes(body.effort as Effort)
      ? (body.effort as Effort)
      : DEFAULT_EFFORT
    : null;
  const maxTokens = Math.min(Math.max(body.maxTokens ?? 16000, 1024), 32000);

  const systemText = buildSystemPrompt(mode);
  const client = new Anthropic();

  const encoder = new TextEncoder();
  const started = Date.now();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const send = (event: StreamEvent) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      const usage: Usage = {
        input_tokens: 0,
        output_tokens: 0,
        cache_read_input_tokens: 0,
        cache_creation_input_tokens: 0,
      };
      const traces: ToolTrace[] = [];
      let thinking = "";
      let apiCalls = 0;
      let stopReason: string | null = null;
      let firstTokenAt: number | null = null;

      const messages: Anthropic.MessageParam[] = history.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      try {
        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
          const params: Anthropic.MessageStreamParams = {
            model: model.id,
            max_tokens: maxTokens,
            system: [
              {
                type: "text",
                text: systemText,
                cache_control: { type: "ephemeral" },
              },
            ],
            messages,
            ...(mode === "agentic" ? { tools: TOOLS } : {}),
            // Adaptive thinking and effort are 5-series only; Haiku takes neither.
            ...(model.supportsAdaptiveThinking
              ? { thinking: { type: "adaptive", display: "summarized" } as const }
              : {}),
            ...(effort ? { output_config: { effort } } : {}),
          };

          apiCalls++;
          const messageStream = client.messages.stream(params);

          for await (const event of messageStream) {
            if (event.type !== "content_block_delta") continue;
            if (event.delta.type === "text_delta") {
              firstTokenAt ??= Date.now();
              send({ type: "text", text: event.delta.text });
            } else if (event.delta.type === "thinking_delta") {
              firstTokenAt ??= Date.now();
              thinking += event.delta.thinking;
              send({ type: "thinking", text: event.delta.thinking });
            }
          }

          const final = await messageStream.finalMessage();
          usage.input_tokens += final.usage.input_tokens ?? 0;
          usage.output_tokens += final.usage.output_tokens ?? 0;
          usage.cache_read_input_tokens +=
            final.usage.cache_read_input_tokens ?? 0;
          usage.cache_creation_input_tokens +=
            final.usage.cache_creation_input_tokens ?? 0;
          stopReason = final.stop_reason ?? null;

          if (final.stop_reason !== "tool_use") break;

          messages.push({ role: "assistant", content: final.content });

          const toolResults: Anthropic.ToolResultBlockParam[] = [];
          for (const block of final.content) {
            if (block.type !== "tool_use") continue;
            send({
              type: "tool_call",
              id: block.id,
              tool: block.name,
              target: JSON.stringify(block.input),
            });
            const result = runTool(block.name, block.input);
            traces.push({
              id: block.id,
              tool: block.name as ToolTrace["tool"],
              target: result.target,
              ok: result.ok,
              chars: result.content.length,
              detail: result.detail,
            });
            send({
              type: "tool_result",
              id: block.id,
              ok: result.ok,
              chars: result.content.length,
              detail: result.detail,
            });
            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: result.content,
              is_error: !result.ok,
            });
          }

          // All tool_results for one assistant turn go back in a single message.
          messages.push({ role: "user", content: toolResults });

          if (round === MAX_TOOL_ROUNDS - 1) {
            send({
              type: "error",
              message: `Stopped after ${MAX_TOOL_ROUNDS} retrieval rounds — the agent kept asking for more files. Try a narrower question, or switch to "full context" mode.`,
            });
          }
        }

        send({
          type: "done",
          meta: {
            model: model.id,
            mode,
            effort,
            usage,
            costUsd: estimateCost(model, usage),
            latencyMs: Date.now() - started,
            timeToFirstTokenMs: firstTokenAt ? firstTokenAt - started : null,
            apiCalls,
            stopReason,
            systemPromptTokensApprox: approxTokens(systemText),
            traces,
            thinking,
          },
        });
      } catch (err) {
        const message =
          err instanceof Anthropic.APIError
            ? `Anthropic API error ${err.status ?? ""}: ${err.message}`
            : err instanceof Error
              ? err.message
              : "Unknown error";
        send({ type: "error", message });
      } finally {
        closed = true;
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
