"use client";

import React from "react";

export function LoginForm() {
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [configured, setConfigured] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    fetch("/api/access")
      .then((r) => r.json() as Promise<{ configured: boolean }>)
      .then((d) => setConfigured(d.configured))
      .catch(() => setConfigured(null));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        window.location.href = "/";
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Could not sign in.");
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
    >
      <form
        onSubmit={submit}
        style={{
          width: "100%",
          maxWidth: 380,
          background: "var(--panel)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: "26px 26px 22px",
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 16 }}>Nelson Clone</div>
        <div
          style={{ color: "var(--text-faint)", fontSize: 12, marginBottom: 18 }}
        >
          Karimu Foundation · COO agent
        </div>
        <p style={{ color: "var(--text-muted)", marginTop: 0 }}>
          This interface reads Karimu&apos;s internal knowledge base, so it is
          not open to the public. Enter the shared password to continue.
        </p>
        {configured === false && (
          <div className="notice" style={{ marginTop: 0 }}>
            No <code>APP_ACCESS_PASSWORD</code> is set on the server, so nobody
            can sign in yet. Set it in Vercel → Project → Settings →
            Environment Variables, then redeploy.
          </div>
        )}
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Shared password"
          style={{
            width: "100%",
            marginTop: 6,
            padding: "9px 10px",
            border: "1px solid var(--border-strong)",
            borderRadius: "var(--radius-sm)",
            background: "var(--panel-2)",
            outline: "none",
          }}
        />
        {error && (
          <div className="notice" style={{ marginTop: 12, marginBottom: 0 }}>
            {error}
          </div>
        )}
        <button
          className="btn btn-primary"
          type="submit"
          disabled={busy || !password}
          style={{ width: "100%", marginTop: 14, padding: "9px 10px" }}
        >
          {busy ? "Checking…" : "Enter"}
        </button>
      </form>
    </div>
  );
}
