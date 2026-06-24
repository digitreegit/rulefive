"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Login failed.");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl bg-panel p-8 shadow-xl ring-1 ring-white/5"
      >
        <div className="mb-1 text-2xl font-bold tracking-tight">
          Rule<span className="text-accent">Five</span>
        </div>
        <p className="mb-6 text-sm text-muted">
          Buy the 5% dip, sell the 5% rip.
        </p>
        <label className="mb-2 block text-sm text-muted">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          className="mb-4 w-full rounded-lg bg-ink px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-accent"
          placeholder="••••••••"
        />
        {error && <p className="mb-4 text-sm text-bad">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-accent px-4 py-2 font-medium text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}
