"use client";

import { useEffect, useState } from "react";
import BackToDashboardLink from "@/components/BackToDashboardLink";
import SymbolSelect from "@/components/SymbolSelect";
import { Cog6ToothIcon, PlayCircleIcon, StopCircleIcon } from "@heroicons/react/24/outline";
import { isStockSymbol, FALLBACK_VOLATILE_STOCKS } from "@/lib/config";

type Settings = {
  symbol: string;
  thresholdPercent: number;
  enabled: boolean;
  referencePrice: number | null;
  manualInvestedOverride: number | null;
  lastRunAt?: string | null;
  lastAction?: string | null;
};

export default function SettingsForm() {
  const [s, setS] = useState<Settings | null>(null);
  const [symbol, setSymbol] = useState("");
  const [symbols, setSymbols] = useState<string[]>([]);
  const [symbolsError, setSymbolsError] = useState("");
  const [threshold, setThreshold] = useState("5");
  const [invested, setInvested] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const [settingsRes, symbolsRes] = await Promise.all([
        fetch("/api/settings", { cache: "no-store" }),
        fetch("/api/stock-symbols", { cache: "no-store" }),
      ]);
      const data = await settingsRes.json();
      setS(data);
      setSymbol(data.symbol ?? "");
      setThreshold(String(data.thresholdPercent ?? 5));
      setInvested(
        data.manualInvestedOverride != null
          ? String(data.manualInvestedOverride)
          : ""
      );

      let list: string[] = FALLBACK_VOLATILE_STOCKS;

      if (symbolsRes.ok) {
        const symData = await symbolsRes.json();
        list = (symData.symbols ?? []).filter((s: string) => isStockSymbol(s));
        if (list.length === 0) list = [...FALLBACK_VOLATILE_STOCKS];
      } else {
        const err = await symbolsRes.json().catch(() => ({}));
        setSymbolsError(err.error ?? "Using default stock list.");
      }

      const dbSymbol = (data.symbol ?? "").toUpperCase();
      let nextSymbol = dbSymbol;
      if (!isStockSymbol(dbSymbol)) {
        nextSymbol = list[0] ?? "TSLA";
      } else if (dbSymbol && !list.includes(dbSymbol)) {
        list = [dbSymbol, ...list.filter((s) => s !== dbSymbol)];
      }

      setSymbol(nextSymbol);
      setSymbols(list);
    })();
  }, []);

  async function save(extra: Record<string, unknown> = {}) {
    setSaving(true);
    setStatus("");
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol,
          thresholdPercent: Number(threshold),
          manualInvestedOverride: invested === "" ? null : Number(invested),
          ...extra,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(data.error ?? "Save failed.");
        return;
      }
      setS((prev) => ({ ...(prev as Settings), ...data }));
      setStatus("Saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Cog6ToothIcon className="h-7 w-7 text-accent" aria-hidden />
          Settings
        </h1>
        <BackToDashboardLink />
      </header>

      {!s ? (
        <div className="text-muted">Loading…</div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-2xl bg-panel p-5 ring-1 ring-white/5">
            <label className="mb-1 block text-sm font-medium">
              Stock symbol to trade
            </label>
            <p className="mb-2 text-xs text-muted">
              Top 20 US stocks ranked by recent daily volatility (refreshed every
              few hours). Changing the symbol re-anchors the reference price on
              the next check. Trades only execute during US market hours.
            </p>
            {symbolsError && (
              <p className="mb-2 text-xs text-bad">{symbolsError}</p>
            )}
            <SymbolSelect
              value={symbol}
              onChange={setSymbol}
              options={symbols}
            />
          </div>

          <div className="rounded-2xl bg-panel p-5 ring-1 ring-white/5">
            <label className="mb-1 block text-sm font-medium">
              Swing threshold (%)
            </label>
            <p className="mb-2 text-xs text-muted">
              Buy after a drop of this %, sell after a rise of this % (from the
              last trade price). Default is 5%.
            </p>
            <input
              type="number"
              min="0.1"
              max="90"
              step="0.1"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              className="w-full rounded-lg bg-ink px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-accent"
            />
          </div>

          <div className="rounded-2xl bg-panel p-5 ring-1 ring-white/5">
            <label className="mb-1 block text-sm font-medium">
              Total invested override (optional)
            </label>
            <p className="mb-2 text-xs text-muted">
              Leave blank to read net deposits straight from Alpaca. Set a number
              (e.g. 500) if your account does not report transfers.
            </p>
            <input
              type="number"
              step="0.01"
              placeholder="(auto from Alpaca)"
              value={invested}
              onChange={(e) => setInvested(e.target.value)}
              className="w-full rounded-lg bg-ink px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-accent"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => save()}
              disabled={saving}
              className="rounded-lg bg-accent px-4 py-2 font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save settings"}
            </button>
            <button
              onClick={() => save({ resetReference: true })}
              disabled={saving}
              className="rounded-lg bg-panel2 px-4 py-2 text-sm ring-1 ring-white/10 hover:opacity-90 disabled:opacity-50"
            >
              Reset reference price
            </button>
            {status && <span className="text-sm text-muted">{status}</span>}
          </div>

          <div className="rounded-2xl bg-panel2 p-5 text-sm text-muted ring-1 ring-white/5">
            <div>
              Current reference price:{" "}
              <span className="text-white">
                {s.referencePrice != null ? s.referencePrice : "not set"}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              Bot is{" "}
              <span
                className={`inline-flex items-center gap-1 ${
                  s.enabled ? "text-good" : "text-bad"
                }`}
              >
                {s.enabled ? (
                  <PlayCircleIcon className="h-4 w-4" aria-hidden />
                ) : (
                  <StopCircleIcon className="h-4 w-4" aria-hidden />
                )}
                {s.enabled ? "running" : "stopped"}
              </span>{" "}
              (toggle from the dashboard).
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
