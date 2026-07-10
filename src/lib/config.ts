// Centralized environment + default configuration.
// All secrets come from environment variables (set in Vercel + .env.local).

export const ALPACA = {
  apiKey: process.env.ALPACA_API_KEY ?? "",
  secretKey: process.env.ALPACA_SECRET_KEY ?? "",
  // paper-api.alpaca.markets (paper) or api.alpaca.markets (live)
  tradingBaseUrl:
    process.env.ALPACA_TRADING_BASE_URL ?? "https://paper-api.alpaca.markets",
  dataBaseUrl: process.env.ALPACA_DATA_URL ?? "https://data.alpaca.markets",
};

export const SUPABASE = {
  url: process.env.SUPABASE_URL ?? "",
  // Server-side only key. NEVER expose to the browser.
  serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
};

// Shared secret required to trigger /api/cron/run (set in cron-job.org header).
export const CRON_SECRET = process.env.CRON_SECRET ?? "";

// Single-user dashboard login.
export const APP_PASSWORD = process.env.APP_PASSWORD ?? "";
// Random long string used to sign the session cookie.
export const AUTH_SECRET = process.env.AUTH_SECRET ?? "";

// Defaults used when the bot_config row has not been customized yet.
export const DEFAULTS = {
  symbol: "TSLA",
  thresholdPercent: 5,
  enabled: false,
};

export function isCrypto(symbol: string): boolean {
  return symbol.includes("/");
}

export function isStockSymbol(symbol: string): boolean {
  return symbol.length > 0 && !isCrypto(symbol);
}

// Default stock picker list when live volatility ranking is unavailable.
export const FALLBACK_VOLATILE_STOCKS = [
  "TSLA",
  "NVDA",
  "AMD",
  "META",
  "COIN",
  "MARA",
  "RIOT",
  "SOFI",
  "PLTR",
  "RKLB",
  "SMCI",
  "ARM",
  "HOOD",
  "GME",
  "AMC",
  "MSTR",
  "RIVN",
  "LCID",
  "NIO",
  "SNAP",
];

export function missingServerEnv(): string[] {
  const missing: string[] = [];
  if (!ALPACA.apiKey) missing.push("ALPACA_API_KEY");
  if (!ALPACA.secretKey) missing.push("ALPACA_SECRET_KEY");
  if (!SUPABASE.url) missing.push("SUPABASE_URL");
  if (!SUPABASE.serviceKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  return missing;
}
