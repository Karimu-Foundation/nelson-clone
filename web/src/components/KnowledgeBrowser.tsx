"use client";

import React from "react";

import { Markdown } from "./Markdown";

type Doc = { id: string; path: string; body: string; description?: string };
type Payload = { skills: Doc[]; knowledge: Doc[] };

export function KnowledgeBrowser() {
  const [data, setData] = React.useState<Payload | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<string | null>(null);
  const [raw, setRaw] = React.useState(false);

  React.useEffect(() => {
    let live = true;
    fetch("/api/kb")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.statusText))))
      .then((payload: Payload) => {
        if (!live) return;
        setData(payload);
        setSelected(payload.knowledge[0]?.path ?? null);
      })
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, []);

  if (error) {
    return <div className="empty">Could not load the knowledge base: {error}</div>;
  }
  if (!data) {
    return <div className="empty">Loading the knowledge base…</div>;
  }

  const all = [...data.knowledge, ...data.skills];
  const doc = all.find((d) => d.path === selected) ?? all[0];

  const Group = ({ title, docs }: { title: string; docs: Doc[] }) => (
    <>
      <h2 className="side-title" style={{ margin: "10px 6px 6px" }}>
        {title}
      </h2>
      {docs.map((d) => (
        <button
          key={d.path}
          className={`kb-item${doc?.path === d.path ? " on" : ""}`}
          onClick={() => setSelected(d.path)}
        >
          <span className="kb-item-name">{d.id}</span>
          <span className="kb-item-meta">
            {" "}
            · {(d.body.length / 1024).toFixed(0)} KB
          </span>
        </button>
      ))}
    </>
  );

  return (
    <div className="kb">
      <div className="kb-list">
        <Group title={`Knowledge (${data.knowledge.length})`} docs={data.knowledge} />
        <Group title={`Skills (${data.skills.length})`} docs={data.skills} />
      </div>
      <div className="kb-doc">
        <div className="kb-doc-inner">
          {doc ? (
            <>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 18,
                }}
              >
                <code
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 12.5,
                    color: "var(--text-muted)",
                  }}
                >
                  {doc.path}
                </code>
                <button
                  className="btn btn-ghost"
                  style={{ marginLeft: "auto" }}
                  onClick={() => setRaw((v) => !v)}
                >
                  {raw ? "Rendered" : "Raw markdown"}
                </button>
              </div>
              {doc.description && (
                <div className="notice" style={{ fontStyle: "italic" }}>
                  {doc.description}
                </div>
              )}
              {raw ? (
                <pre className="raw">{doc.body}</pre>
              ) : (
                <Markdown source={doc.body} />
              )}
            </>
          ) : (
            <div className="empty">Nothing to show.</div>
          )}
        </div>
      </div>
    </div>
  );
}
