import { ALPACA, isCrypto } from "./config";

function tradingHeaders(): HeadersInit {
  return {
    "APCA-API-KEY-ID": ALPACA.apiKey,
    "APCA-API-SECRET-KEY": ALPACA.secretKey,
    "Content-Type": "application/json",
  };
}

async function tradingGet<T>(path: string): Promise<T> {
  const res = await fetch(`${ALPACA.tradingBaseUrl}${path}`, {
    headers: tradingHeaders(),
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Alpaca GET ${path} -> ${res.status}: ${body}`);
  }
  return (await res.json()) as T;
}

async function tradingPost<T>(path: string, payload: unknown): Promise<T> {
  const res = await fetch(`${ALPACA.tradingBaseUrl}${path}`, {
    method: "POST",
    headers: tradingHeaders(),
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Alpaca POST ${path} -> ${res.status}: ${body}`);
  }
  return (await res.json()) as T;
}

export type AlpacaAccount = {
  cash: string;
  equity: string;
  portfolio_value: string;
  buying_power: string;
  non_marginable_buying_power: string;
  currency: string;
  trading_blocked: boolean;
  account_blocked: boolean;
};

export type AlpacaPosition = {
  symbol: string;
  qty: string;
  qty_available: string;
  avg_entry_price: string;
  market_value: string;
  current_price: string;
  unrealized_pl: string;
  unrealized_plpc: string;
};

export type AlpacaOrder = {
  id: string;
  symbol: string;
  side: string;
  qty: string | null;
  notional: string | null;
  filled_avg_price: string | null;
  status: string;
  submitted_at: string;
};

export type PortfolioHistory = {
  timestamp: number[];
  equity: (number | null)[];
  profit_loss: (number | null)[];
  profit_loss_pct: (number | null)[];
  base_value: number;
  timeframe: string;
};

export async function getAccount(): Promise<AlpacaAccount> {
  return tradingGet<AlpacaAccount>("/v2/account");
}

export async function getPositions(): Promise<AlpacaPosition[]> {
  return tradingGet<AlpacaPosition[]>("/v2/positions");
}

export async function getPositionFor(
  symbol: string
): Promise<AlpacaPosition | null> {
  const positions = await getPositions();
  // Crypto positions on Alpaca are reported without the slash (e.g. XRPUSD).
  const plain = symbol.replace("/", "");
  return (
    positions.find((p) => p.symbol === symbol || p.symbol === plain) ?? null
  );
}

export async function getPortfolioHistory(
  period = "1M",
  timeframe = "1D"
): Promise<PortfolioHistory> {
  const qs = new URLSearchParams({
    period,
    timeframe,
    intraday_reporting: "market_hours",
    pnl_reset: "no_reset",
  });
  return tradingGet<PortfolioHistory>(
    `/v2/account/portfolio/history?${qs.toString()}`
  );
}

// Sum of cash deposits (CSD) minus withdrawals (CSW) = net invested capital.
// Returns null when the account exposes no transfer activity (e.g. fresh paper
// accounts), so callers can fall back to a manual override.
export async function getNetDeposits(): Promise<number | null> {
  try {
    const acts = await tradingGet<
      { activity_type: string; net_amount?: string; amount?: string }[]
    >("/v2/account/activities?activity_types=CSD,CSW&page_size=100");
    if (!acts || acts.length === 0) return null;
    let net = 0;
    for (const a of acts) {
      const amt = parseFloat(a.net_amount ?? a.amount ?? "0");
      if (Number.isNaN(amt)) continue;
      net += a.activity_type === "CSW" ? -Math.abs(amt) : Math.abs(amt);
    }
    return net;
  } catch {
    return null;
  }
}

export async function getRecentOrders(limit = 20): Promise<AlpacaOrder[]> {
  return tradingGet<AlpacaOrder[]>(
    `/v2/orders?status=all&limit=${limit}&direction=desc`
  );
}

type AlpacaAsset = {
  symbol: string;
  name: string;
  status: string;
  tradable: boolean;
  class: string;
};

// Active, tradable crypto pairs quoted in USD (e.g. BTC/USD, AVAX/USD).
export async function getTradableCryptoUsdSymbols(): Promise<string[]> {
  const assets = await tradingGet<AlpacaAsset[]>(
    "/v2/assets?asset_class=crypto&status=active"
  );
  return assets
    .filter((a) => a.tradable && a.symbol.endsWith("/USD"))
    .map((a) => a.symbol)
    .sort((a, b) => a.localeCompare(b));
}

// ── Market data: bars & latest price ────────────────────────────────────────

export type PriceBar = {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
};

export async function getBars(
  symbol: string,
  timeframe = "1Hour",
  limit = 168
): Promise<PriceBar[]> {
  if (isCrypto(symbol)) {
    const qs = new URLSearchParams({
      symbols: symbol,
      timeframe,
      limit: String(limit),
    });
    const url = `${ALPACA.dataBaseUrl}/v1beta3/crypto/us/bars?${qs.toString()}`;
    const res = await fetch(url, {
      headers: tradingHeaders(),
      cache: "no-store",
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Alpaca crypto bars ${symbol} -> ${res.status}: ${body}`);
    }
    const json = (await res.json()) as {
      bars: Record<
        string,
        { t: string; o: number; h: number; l: number; c: number; v: number }[]
      >;
    };
    const rows = json.bars?.[symbol] ?? [];
    return rows.map((b) => ({
      t: new Date(b.t).getTime(),
      o: b.o,
      h: b.h,
      l: b.l,
      c: b.c,
      v: b.v,
    }));
  }

  const qs = new URLSearchParams({
    timeframe,
    limit: String(limit),
    feed: "iex",
  });
  const url = `${ALPACA.dataBaseUrl}/v2/stocks/${encodeURIComponent(
    symbol
  )}/bars?${qs.toString()}`;
  const res = await fetch(url, { headers: tradingHeaders(), cache: "no-store" });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Alpaca stock bars ${symbol} -> ${res.status}: ${body}`);
  }
  const json = (await res.json()) as {
    bars: { t: string; o: number; h: number; l: number; c: number; v: number }[];
  };
  return (json.bars ?? []).map((b) => ({
    t: new Date(b.t).getTime(),
    o: b.o,
    h: b.h,
    l: b.l,
    c: b.c,
    v: b.v,
  }));
}

export async function getLatestPrice(symbol: string): Promise<number> {
  if (isCrypto(symbol)) {
    const qs = new URLSearchParams({ symbols: symbol });
    const url = `${ALPACA.dataBaseUrl}/v1beta3/crypto/us/latest/trades?${qs.toString()}`;
    const res = await fetch(url, {
      headers: tradingHeaders(),
      cache: "no-store",
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Alpaca crypto price ${symbol} -> ${res.status}: ${body}`);
    }
    const json = (await res.json()) as {
      trades: Record<string, { p: number }>;
    };
    const trade = json.trades?.[symbol];
    if (!trade) throw new Error(`No price data for ${symbol}`);
    return trade.p;
  }

  // Equity: latest trade from the IEX feed (free tier).
  const url = `${ALPACA.dataBaseUrl}/v2/stocks/${encodeURIComponent(
    symbol
  )}/trades/latest?feed=iex`;
  const res = await fetch(url, { headers: tradingHeaders(), cache: "no-store" });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Alpaca stock price ${symbol} -> ${res.status}: ${body}`);
  }
  const json = (await res.json()) as { trade: { p: number } };
  if (!json.trade) throw new Error(`No price data for ${symbol}`);
  return json.trade.p;
}

// ── Orders ──────────────────────────────────────────────────────────────────

export async function submitBuyNotional(
  symbol: string,
  notional: number
): Promise<AlpacaOrder> {
  return tradingPost<AlpacaOrder>("/v2/orders", {
    symbol,
    notional: notional.toFixed(2),
    side: "buy",
    type: "market",
    time_in_force: isCrypto(symbol) ? "gtc" : "day",
  });
}

export async function submitSellQty(
  symbol: string,
  qty: string
): Promise<AlpacaOrder> {
  return tradingPost<AlpacaOrder>("/v2/orders", {
    symbol,
    qty,
    side: "sell",
    type: "market",
    time_in_force: isCrypto(symbol) ? "gtc" : "day",
  });
}
