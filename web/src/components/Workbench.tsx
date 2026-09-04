"use client";

import React from "react";

import {
  DEFAULT_EFFORT,
  DEFAULT_MODEL,
  EFFORT_LEVELS,
  MODELS,
  type Effort,
  type ModelId,
} from "@/lib/models";
import type {
  ChatMessage,
  ContextMode,
  Evaluation,
  ResponseMeta,
  StreamEvent,
} from "@/lib/types";

import { AnalysisPanel, FLAGS } from "./AnalysisPanel";
import { KnowledgeBrowser } from "./KnowledgeBrowser";
import { Markdown } from "./Markdown";

const PRESETS = [
  {
    label: "Smoke test",
    prompt:
      "Read everything in the knowledge base. Tell me what's solid, what's still an assumption from the public annual reports, and what's missing or too generic to be useful.",
  },
  {
    label: "Weekly pre-read",
    prompt: "Draft this week's Leadership Team pre-read.",
  },
  {
    label: "Escalation check",
    prompt:
      "A district official has asked us to fund a classroom block in a ward we haven't worked in, and wants an answer this week. Does this need escalation, and to whom?",
  },
  {
    label: "Decision checklist",
    prompt:
      "Walk me through the decision checklist for accepting a restricted grant that would fund a single pillar in one ward for three years.",
  },
  {
    label: "Volunteer recognition",
    prompt:
      "Draft a volunteer recognition message for someone who rebuilt our donor database over three months, unpaid, alongside a full-time job.",
  },
  {
    label: "Donor bad news",
    prompt:
      "We're well short of the fundraising goal this year. Draft the update to donors.",
  },
  {
    label: "Grounding trap",
    prompt:
      "How many volunteers do we have right now, in exactly how many countries, and what was last year's efficiency ratio?",
  },
];

const STORAGE_KEY = "nelson-clone.review.v1";

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

type Stored = Record<string, Evaluation>;

export function Workbench() {
  const [tab, setTab] = React.useState<"chat" | "kb">("chat");
  const [model, setModel] = React.useState<ModelId>(DEFAULT_MODEL);
  const [mode, setMode] = React.useState<ContextMode>("agentic");
  const [effort, setEffort] = React.useState<Effort>(DEFAULT_EFFORT);
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [input, setInput] = React.useState("");
  const [streaming, setStreaming] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [stored, setStored] = React.useState<Stored>({});

  const threadRef = React.useRef<HTMLDivElement>(null);
  const abortRef = React.useRef<AbortController | null>(null);
  const modelSpec = MODELS.find((m) => m.id === model) ?? MODELS[0];

  // Load saved scores from this browser.
  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setStored(JSON.parse(raw) as Stored);
    } catch {
      /* private mode / blocked storage — scores just won't persist */
    }
  }, []);

  const persist = React.useCallback((next: Stored) => {
    setStored(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  React.useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, streaming]);

  const selected =
    messages.find((m) => m.id === selectedId && m.role === "assistant") ??
    [...messages].reverse().find((m) => m.role === "assistant") ??
    null;

  const withEvaluations = React.useMemo(
    () =>
      messages.map((m) =>
        m.role === "assistant" && stored[m.id]
          ? { ...m, evaluation: stored[m.id] }
          : m,
      ),
    [messages, stored],
  );

  const selectedWithEval = selected
    ? withEvaluations.find((m) => m.id === selected.id) ?? selected
    : null;

  async function send(text: string) {
    const prompt = text.trim();
    if (!prompt || streaming) return;

    const userMsg: ChatMessage = { id: uid(), role: "user", content: prompt };
    const assistantId = uid();
    const history = [...messages, userMsg];

    setMessages([
      ...history,
      { id: assistantId, role: "assistant", content: "" },
    ]);
    setSelectedId(assistantId);
    setInput("");
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    const patch = (fn: (m: ChatMessage) => ChatMessage) =>
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? fn(m) : m)),
      );

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          messages: history.map((m) => ({ role: m.role, content: m.content })),
          model,
          mode,
          effort,
        }),
      });

      if (!res.ok || !res.body) {
        const detail = await res
          .json()
          .then((j: { error?: string }) => j.error)
          .catch(() => null);
        throw new Error(detail ?? `Request failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const liveTraces: ResponseMeta["traces"] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const line = part.split("\n").find((l) => l.startsWith("data: "));
          if (!line) continue;
          const event = JSON.parse(line.slice(6)) as StreamEvent;

          if (event.type === "text") {
            patch((m) => ({ ...m, content: m.content + event.text }));
          } else if (event.type === "tool_call") {
            let target = event.target;
            try {
              const parsed = JSON.parse(event.target) as Record<string, string>;
              target = parsed.skill ?? parsed.file ?? event.target;
            } catch {
              /* keep the raw string */
            }
            liveTraces.push({
              id: event.id,
              tool: event.tool as "load_skill" | "read_knowledge",
              target,
              ok: true,
              chars: 0,
            });
            const snapshot = [...liveTraces];
            patch((m) => ({
              ...m,
              meta: { ...(m.meta ?? partialMeta()), traces: snapshot },
            }));
          } else if (event.type === "tool_result") {
            const trace = liveTraces.find((t) => t.id === event.id);
            if (trace) {
              trace.ok = event.ok;
              trace.chars = event.chars;
              trace.detail = event.detail;
            }
          } else if (event.type === "done") {
            patch((m) => ({ ...m, meta: event.meta }));
          } else if (event.type === "error") {
            patch((m) => ({ ...m, error: event.message }));
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        patch((m) => ({ ...m, error: "Stopped." }));
      } else {
        patch((m) => ({ ...m, error: (err as Error).message }));
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }

    function partialMeta(): ResponseMeta {
      return {
        model,
        mode,
        effort: modelSpec.supportsEffort ? effort : null,
        usage: {
          input_tokens: 0,
          output_tokens: 0,
          cache_read_input_tokens: 0,
          cache_creation_input_tokens: 0,
        },
        costUsd: 0,
        latencyMs: 0,
        timeToFirstTokenMs: null,
        apiCalls: 1,
        stopReason: null,
        systemPromptTokensApprox: 0,
        traces: [],
        thinking: "",
      };
    }
  }

  function exportReview() {
    const rows = withEvaluations
      .filter((m) => m.role === "assistant")
      .map((m, i) => {
        const question =
          withEvaluations
            .slice(0, withEvaluations.indexOf(m))
            .reverse()
            .find((x) => x.role === "user")?.content ?? "";
        return {
          index: i + 1,
          question,
          answer: m.content,
          error: m.error ?? null,
          meta: m.meta ?? null,
          evaluation: m.evaluation ?? null,
          flagLabels: (m.evaluation?.flags ?? []).map(
            (f) => FLAGS.find((x) => x.id === f)?.label ?? f,
          ),
        };
      });

    const payload = {
      exportedAt: new Date().toISOString(),
      settings: { model, mode, effort },
      turns: rows,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nelson-clone-review-${new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/[:T]/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const evaluatedCount = Object.values(stored).filter(
    (e) => e.rating !== null || e.flags.length > 0 || e.notes.trim(),
  ).length;

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">Nelson Clone</span>
          <span className="brand-sub">Karimu Foundation · COO agent</span>
        </div>

        <div className="tabs" role="tablist">
          <button
            className="tab"
            role="tab"
            aria-selected={tab === "chat"}
            onClick={() => setTab("chat")}
          >
            Conversation
          </button>
          <button
            className="tab"
            role="tab"
            aria-selected={tab === "kb"}
            onClick={() => setTab("kb")}
          >
            Knowledge base
          </button>
        </div>

        <div className="control">
          <label htmlFor="model">Model</label>
          <select
            id="model"
            value={model}
            onChange={(e) => setModel(e.target.value as ModelId)}
            title={modelSpec.note}
          >
            {MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div className="control">
          <label htmlFor="mode">Context</label>
          <select
            id="mode"
            value={mode}
            onChange={(e) => setMode(e.target.value as ContextMode)}
            title={
              mode === "agentic"
                ? "The agent retrieves skills and knowledge files on demand — you see exactly what it read."
                : "Everything is preloaded: one API call, no retrieval trace."
            }
          >
            <option value="agentic">Agentic (retrieval traced)</option>
            <option value="full">Full context (no trace)</option>
          </select>
        </div>

        {modelSpec.supportsEffort && (
          <div className="control">
            <label htmlFor="effort">Effort</label>
            <select
              id="effort"
              value={effort}
              onChange={(e) => setEffort(e.target.value as Effort)}
            >
              {EFFORT_LEVELS.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </div>
        )}

        <button
          className="btn btn-ghost"
          onClick={() => {
            abortRef.current?.abort();
            setMessages([]);
            setSelectedId(null);
          }}
          disabled={streaming || messages.length === 0}
        >
          New conversation
        </button>
      </header>

      {tab === "kb" ? (
        <KnowledgeBrowser />
      ) : (
        <div className="main">
          <div className="column">
            <div className="thread" ref={threadRef}>
              <div className="thread-inner">
                {withEvaluations.length === 0 && (
                  <div className="hero">
                    <h1>Talk to the clone, then judge it.</h1>
                    <p>
                      Answers come back in Nelson&apos;s own first person, as he
                      would write them, so the thing you are judging is
                      fidelity: is this what he would have said? Each one also
                      carries the skills and knowledge files it actually read,
                      what it cost, and a scorecard — so you can tell real
                      grounding from plausible-sounding filler. It replies in
                      English by design.
                    </p>
                  </div>
                )}

                {withEvaluations.map((m) => {
                  const isAssistant = m.role === "assistant";
                  const isSelected = isAssistant && selected?.id === m.id;
                  const traces = m.meta?.traces ?? [];
                  return (
                    <div
                      key={m.id}
                      className={`msg msg-${m.role}${
                        isSelected ? " selected" : ""
                      }`}
                      onClick={() => isAssistant && setSelectedId(m.id)}
                    >
                      <div className="msg-head">
                        <span>{isAssistant ? "Nelson Clone" : "You"}</span>
                        {m.evaluation?.rating != null && (
                          <span className="chip">{m.evaluation.rating}/5</span>
                        )}
                        {isAssistant && !isSelected && m.meta && (
                          <button
                            className="btn btn-ghost"
                            style={{ fontSize: 11, padding: "0 6px" }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedId(m.id);
                            }}
                          >
                            analyse
                          </button>
                        )}
                      </div>

                      {isAssistant && traces.length > 0 && (
                        <div className="retrieval">
                          {traces.map((t, i) => (
                            <span
                              key={t.id + i}
                              className={`chip ${
                                !t.ok
                                  ? "chip-bad"
                                  : t.tool === "load_skill"
                                    ? "chip-skill"
                                    : "chip-knowledge"
                              }`}
                            >
                              {t.tool === "load_skill" ? "skill" : "kb"} ·{" "}
                              {t.target}
                            </span>
                          ))}
                        </div>
                      )}

                      {(!isAssistant || m.content || !m.error) && (
                        <div className="bubble">
                          {isAssistant ? (
                            m.content ? (
                              <Markdown source={m.content} />
                            ) : (
                              <span className="dots" />
                            )
                          ) : (
                            m.content
                          )}
                        </div>
                      )}

                      {m.error && (
                        <div className="notice" style={{ marginTop: 0 }}>
                          {m.error}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="composer">
              <div className="composer-inner">
                <div className="presets">
                  {PRESETS.map((p) => (
                    <button
                      key={p.label}
                      className="preset"
                      onClick={() => setInput(p.prompt)}
                      title={p.prompt}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <div className="composer-box">
                  <textarea
                    rows={2}
                    value={input}
                    placeholder="Ask the COO anything — a decision, a draft, a status review…"
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void send(input);
                      }
                    }}
                  />
                  {streaming ? (
                    <button
                      className="btn"
                      onClick={() => abortRef.current?.abort()}
                    >
                      Stop
                    </button>
                  ) : (
                    <button
                      className="btn btn-primary"
                      onClick={() => void send(input)}
                      disabled={!input.trim()}
                    >
                      Send
                    </button>
                  )}
                </div>
                <div className="composer-hint">
                  Enter sends · Shift+Enter for a new line. Nothing here is
                  final: the agent drafts and recommends, a human signs off.
                </div>
              </div>
            </div>
          </div>

          <AnalysisPanel
            message={selectedWithEval}
            streaming={streaming}
            onEvaluate={(id, evaluation) =>
              persist({ ...stored, [id]: evaluation })
            }
            onExport={exportReview}
            evaluatedCount={evaluatedCount}
          />
        </div>
      )}
    </div>
  );
}
