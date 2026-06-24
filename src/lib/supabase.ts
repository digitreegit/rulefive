import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE, DEFAULTS } from "./config";

let _client: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (!_client) {
    _client = createClient(SUPABASE.url, SUPABASE.serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _client;
}

export type BotConfig = {
  id: number;
  symbol: string;
  threshold_percent: number;
  enabled: boolean;
  reference_price: number | null;
  last_run_at: string | null;
  last_action: string | null;
  manual_invested_override: number | null;
  updated_at: string | null;
};

const DEFAULT_CONFIG: BotConfig = {
  id: 1,
  symbol: DEFAULTS.symbol,
  threshold_percent: DEFAULTS.thresholdPercent,
  enabled: DEFAULTS.enabled,
  reference_price: null,
  last_run_at: null,
  last_action: null,
  manual_invested_override: null,
  updated_at: null,
};

// Reads the single config row (id=1), creating it from defaults if absent.
export async function getConfig(): Promise<BotConfig> {
  const db = supabase();
  const { data, error } = await db
    .from("bot_config")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error) throw new Error(`getConfig: ${error.message}`);
  if (data) return data as BotConfig;

  const { data: created, error: insErr } = await db
    .from("bot_config")
    .insert(DEFAULT_CONFIG)
    .select("*")
    .single();
  if (insErr) throw new Error(`getConfig.insert: ${insErr.message}`);
  return created as BotConfig;
}

export async function updateConfig(
  patch: Partial<Omit<BotConfig, "id">>
): Promise<BotConfig> {
  const db = supabase();
  await getConfig(); // ensure row exists
  const { data, error } = await db
    .from("bot_config")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", 1)
    .select("*")
    .single();
  if (error) throw new Error(`updateConfig: ${error.message}`);
  return data as BotConfig;
}

export type TradeLogRow = {
  id?: number;
  created_at?: string;
  side: string;
  symbol: string;
  price: number | null;
  qty: number | null;
  notional: number | null;
  reason: string | null;
  alpaca_order_id: string | null;
};

export async function logTrade(row: TradeLogRow): Promise<void> {
  const db = supabase();
  const { error } = await db.from("trade_log").insert(row);
  if (error) throw new Error(`logTrade: ${error.message}`);
}

export async function recentTrades(limit = 20): Promise<TradeLogRow[]> {
  const db = supabase();
  const { data, error } = await db
    .from("trade_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`recentTrades: ${error.message}`);
  return (data ?? []) as TradeLogRow[];
}
