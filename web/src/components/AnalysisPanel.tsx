"use client";

import React from "react";

import { getModel } from "@/lib/models";
import type { ChatMessage, Evaluation, ToolTrace } from "@/lib/types";

export const FLAGS: { id: string; label: string; bad?: boolean }[] = [
  { id: "grounded", label: "Grounded in the KB" },
  { id: "voice", label: "Sounds like Nelson" },
  { id: "principles", label: "Applied the principles" },
  { id: "escalation", label: "Escalated correctly" },
  { id: "usable", label: "Usable as-is" },
  { id: "invented", label: "Invented facts", bad: true },
  { id: "generic", label: "Generic NGO advice", bad: true },
  { id: "missed-history", label: "Missed ops-history", bad: true },
  { id: "wrong-voice", label: "Off voice", bad: true },
  { id: "overstepped", label: "Overstepped (no sign-off)", bad: true },
];

function fmtMoney(usd: number): string {
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(3)}`;
}

function fmtMs(ms: number): string {
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`;
}

function TraceRow({ trace, order }: { trace: ToolTrace; order: number }) {
  const isSkill = trace.tool === "load_skill";
  const cls = !trace.ok
    ? "chip chip-bad"
    : isSkill
      ? "chip chip-skill"
      : "chip chip-knowledge";
  return (
    <div className="trace-item">
      <span className="trace-order">{order}</span>
      <span className={cls}>
        {isSkill ? "skill" : "kb"} · {trace.target}
      </span>
      <span className="trace-size">
        {trace.ok ? `${(trace.chars / 1024).toFixed(1)} KB` : trace.detail}
      </span>
    </div>
  );
}

export function AnalysisPanel({
  message,
  streaming,
  onEvaluate,
  onExport,
  evaluatedCount,
}: {
  message: ChatMessage | null;
  streaming: boolean;
  onEvaluate: (id: string, evaluation: Evaluation) => void;
  onExport: () => void;
  evaluatedCount: number;
}) {
  if (!message) {
    return (
      <div className="column side">
        <div className="side-section">
          <h2 className="side-title">Response analysis</h2>
          <p className="empty">
            Send a message. Every answer gets its retrieval trace, cost, latency
            and a scorecard here.
          </p>
        </div>
      </div>
    );
  }

  const meta = message.meta;
  const evaluation: Evaluation =
    message.evaluation ?? { rating: null, flags: [], notes: "" };
  const skills = meta?.traces.filter((t) => t.tool === "load_skill") ?? [];
  const files = meta?.traces.filter((t) => t.tool === "read_knowledge") ?? [];

  const toggleFlag = (id: string) => {
    const next = evaluation.flags.includes(id)
      ? evaluation.flags.filter((f) => f !== id)
      : [...evaluation.flags, id];
    onEvaluate(message.id, { ...evaluation, flags: next });
  };

  return (
    <div className="column side">
      <div className="side-section">
        <h2 className="side-title">Grounding — what it actually read</h2>
        {streaming && !meta ? (
          <p className="empty">Retrieving…</p>
        ) : !meta ? (
          <p className="empty">No metadata for this message.</p>
        ) : meta.mode === "full" ? (
          <p className="empty">
            Full-context mode: all 10 skills and {""}
            {meta.systemPromptTokensApprox.toLocaleString()} tokens of knowledge
            were preloaded, so there is no per-answer retrieval trace. Switch to
            agentic mode to see which files an answer actually pulls.
          </p>
        ) : meta.traces.length === 0 ? (
          <div className="notice">
            The agent answered without loading a single skill or knowledge file.
            For anything substantive that is a finding — the answer is not
            grounded in Karimu&apos;s knowledge base.
          </div>
        ) : (
          <>
            <div className="trace">
              {meta.traces.map((t, i) => (
                <TraceRow key={t.id + i} trace={t} order={i + 1} />
              ))}
            </div>
            <dl className="kv" style={{ marginTop: 12 }}>
              <dt>Skills loaded</dt>
              <dd>
                {skills.length} / 10
              </dd>
              <dt>Knowledge files read</dt>
              <dd>{files.length} / 7</dd>
              <dt>Retrieval rounds</dt>
              <dd>{Math.max(meta.apiCalls - 1, 0)}</dd>
            </dl>
          </>
        )}
      </div>

      {meta && (
        <>
          <div className="side-section">
            <h2 className="side-title">Run</h2>
            <div className="stat-row">
              <div className="stat">
                <div className="stat-label">Latency</div>
                <div className="stat-value">{fmtMs(meta.latencyMs)}</div>
              </div>
              <div className="stat">
                <div className="stat-label">Cost</div>
                <div className="stat-value">{fmtMoney(meta.costUsd)}</div>
              </div>
            </div>
            <dl className="kv" style={{ marginTop: 12 }}>
              <dt>Model</dt>
              <dd>{getModel(meta.model).label}</dd>
              <dt>Context mode</dt>
              <dd>{meta.mode}</dd>
              <dt>Effort</dt>
              <dd>{meta.effort ?? "n/a"}</dd>
              <dt>API calls</dt>
              <dd>{meta.apiCalls}</dd>
              <dt>Time to first token</dt>
              <dd>
                {meta.timeToFirstTokenMs === null
                  ? "—"
                  : fmtMs(meta.timeToFirstTokenMs)}
              </dd>
              <dt>Stop reason</dt>
              <dd>{meta.stopReason ?? "—"}</dd>
              <dt>Input tokens</dt>
              <dd>{meta.usage.input_tokens.toLocaleString()}</dd>
              <dt>Output tokens</dt>
              <dd>{meta.usage.output_tokens.toLocaleString()}</dd>
              <dt>Cache read</dt>
              <dd>{meta.usage.cache_read_input_tokens.toLocaleString()}</dd>
              <dt>Cache written</dt>
              <dd>
                {meta.usage.cache_creation_input_tokens.toLocaleString()}
              </dd>
              <dt>System prompt</dt>
              <dd>~{meta.systemPromptTokensApprox.toLocaleString()} tok</dd>
            </dl>
          </div>

          {meta.thinking.trim() && (
            <div className="side-section">
              <h2 className="side-title">Reasoning summary</h2>
              <details>
                <summary>Show the model&apos;s summarised thinking</summary>
                <div className="thinking" style={{ marginTop: 8 }}>
                  {meta.thinking}
                </div>
              </details>
            </div>
          )}
        </>
      )}

      <div className="side-section">
        <h2 className="side-title">Score this answer</h2>
        <div className="stars">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              className={`star${evaluation.rating === n ? " on" : ""}`}
              onClick={() =>
                onEvaluate(message.id, {
                  ...evaluation,
                  rating: evaluation.rating === n ? null : n,
                })
              }
              aria-label={`${n} out of 5`}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="flags">
          {FLAGS.map((f) => (
            <button
              key={f.id}
              className={`flag${evaluation.flags.includes(f.id) ? " on" : ""}${
                f.bad ? " flag-bad" : ""
              }`}
              onClick={() => toggleFlag(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <textarea
          className="notes"
          placeholder="What is wrong or right about this answer? What would Nelson have said instead?"
          value={evaluation.notes}
          onChange={(e) =>
            onEvaluate(message.id, { ...evaluation, notes: e.target.value })
          }
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginTop: 10,
          }}
        >
          <button className="btn" onClick={onExport}>
            Export review
          </button>
          <span style={{ fontSize: 11.5, color: "var(--text-faint)" }}>
            {evaluatedCount} scored · saved in this browser
          </span>
        </div>
      </div>
    </div>
  );
}
