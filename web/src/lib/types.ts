import type { Effort, ModelId } from "./models";

export type ContextMode = "agentic" | "full";

export type ToolTrace = {
  id: string;
  tool: "load_skill" | "read_knowledge";
  target: string;
  ok: boolean;
  chars: number;
  detail?: string;
};

export type Usage = {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens: number;
  cache_creation_input_tokens: number;
};

export type ResponseMeta = {
  model: ModelId;
  mode: ContextMode;
  effort: Effort | null;
  usage: Usage;
  costUsd: number;
  latencyMs: number;
  timeToFirstTokenMs: number | null;
  apiCalls: number;
  stopReason: string | null;
  systemPromptTokensApprox: number;
  traces: ToolTrace[];
  thinking: string;
};

export type Evaluation = {
  rating: number | null;
  flags: string[];
  notes: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  meta?: ResponseMeta;
  evaluation?: Evaluation;
  error?: string;
};

/** Server-sent event payloads from /api/chat. */
export type StreamEvent =
  | { type: "text"; text: string }
  | { type: "thinking"; text: string }
  | { type: "tool_call"; id: string; tool: string; target: string }
  | { type: "tool_result"; id: string; ok: boolean; chars: number; detail?: string }
  | { type: "done"; meta: ResponseMeta }
  | { type: "error"; message: string };
