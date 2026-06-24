import {
  getAccount,
  getLatestPrice,
  getPositionFor,
  submitBuyNotional,
  submitSellQty,
} from "./alpaca";
import { getConfig, updateConfig, logTrade } from "./supabase";

export type RunResult = {
  ok: boolean;
  action: "init" | "buy" | "sell" | "hold" | "disabled" | "error";
  message: string;
  symbol?: string;
  price?: number;
  referencePrice?: number | null;
  changePercent?: number;
  details?: Record<string, unknown>;
};

// Treat a position as "open" only above a tiny dust threshold so leftover
// fractional crumbs do not block the next buy.
const DUST_USD = 1;

export async function runBot(): Promise<RunResult> {
  const cfg = await getConfig();

  if (!cfg.enabled) {
    await updateConfig({
      last_run_at: new Date().toISOString(),
      last_action: "disabled",
    });
    return { ok: true, action: "disabled", message: "Bot is turned off." };
  }

  const symbol = cfg.symbol;
  const threshold = Number(cfg.threshold_percent) || 5;

  let price: number;
  try {
    price = await getLatestPrice(symbol);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await updateConfig({
      last_run_at: new Date().toISOString(),
      last_action: `price error: ${msg}`.slice(0, 240),
    });
    return { ok: false, action: "error", message: msg, symbol };
  }

  // First run (or after a reset): anchor the reference price and wait.
  if (cfg.reference_price == null) {
    await updateConfig({
      reference_price: price,
      last_run_at: new Date().toISOString(),
      last_action: `initialized reference @ ${price}`,
    });
    return {
      ok: true,
      action: "init",
      message: `Reference price set to ${price}.`,
      symbol,
      price,
      referencePrice: price,
      changePercent: 0,
    };
  }

  const reference = Number(cfg.reference_price);
  const changePercent = ((price - reference) / reference) * 100;

  const account = await getAccount();
  if (account.trading_blocked || account.account_blocked) {
    await updateConfig({
      last_run_at: new Date().toISOString(),
      last_action: "broker blocked trading",
    });
    return {
      ok: false,
      action: "error",
      message: "Alpaca reports trading is blocked on this account.",
      symbol,
      price,
      referencePrice: reference,
      changePercent,
    };
  }

  const position = await getPositionFor(symbol);
  const positionValue = position ? parseFloat(position.market_value) : 0;
  const hasPosition = positionValue > DUST_USD;

  // Holding the asset → look for a +threshold% move to SELL.
  if (hasPosition) {
    if (changePercent >= threshold) {
      const qty = position!.qty_available || position!.qty;
      try {
        const order = await submitSellQty(symbol, qty);
        await updateConfig({
          reference_price: price,
          last_run_at: new Date().toISOString(),
          last_action: `SELL ${qty} ${symbol} @ ~${price} (+${changePercent.toFixed(2)}%)`,
        });
        await logTrade({
          side: "sell",
          symbol,
          price,
          qty: parseFloat(qty),
          notional: positionValue,
          reason: `+${changePercent.toFixed(2)}% >= ${threshold}%`,
          alpaca_order_id: order.id,
        });
        return {
          ok: true,
          action: "sell",
          message: `Sold ${qty} ${symbol} at ~${price} (+${changePercent.toFixed(2)}%).`,
          symbol,
          price,
          referencePrice: price,
          changePercent,
        };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await updateConfig({
          last_run_at: new Date().toISOString(),
          last_action: `sell error: ${msg}`.slice(0, 240),
        });
        return { ok: false, action: "error", message: msg, symbol, price };
      }
    }
    await updateConfig({
      last_run_at: new Date().toISOString(),
      last_action: `hold position (${changePercent.toFixed(2)}% vs +${threshold}%)`,
    });
    return {
      ok: true,
      action: "hold",
      message: `Holding ${symbol}. Need +${threshold}% to sell (now ${changePercent.toFixed(2)}%).`,
      symbol,
      price,
      referencePrice: reference,
      changePercent,
    };
  }

  // In cash → look for a -threshold% move to BUY.
  if (changePercent <= -threshold) {
    const cash = parseFloat(
      account.non_marginable_buying_power || account.cash || "0"
    );
    const notional = Math.floor(cash * 0.99 * 100) / 100; // keep a small buffer
    if (notional < 1) {
      await updateConfig({
        last_run_at: new Date().toISOString(),
        last_action: `buy signal but no cash ($${cash.toFixed(2)})`,
      });
      return {
        ok: true,
        action: "hold",
        message: `Buy signal but insufficient cash ($${cash.toFixed(2)}).`,
        symbol,
        price,
        referencePrice: reference,
        changePercent,
      };
    }
    try {
      const order = await submitBuyNotional(symbol, notional);
      await updateConfig({
        reference_price: price,
        last_run_at: new Date().toISOString(),
        last_action: `BUY $${notional} ${symbol} @ ~${price} (${changePercent.toFixed(2)}%)`,
      });
      await logTrade({
        side: "buy",
        symbol,
        price,
        qty: null,
        notional,
        reason: `${changePercent.toFixed(2)}% <= -${threshold}%`,
        alpaca_order_id: order.id,
      });
      return {
        ok: true,
        action: "buy",
        message: `Bought $${notional} of ${symbol} at ~${price} (${changePercent.toFixed(2)}%).`,
        symbol,
        price,
        referencePrice: price,
        changePercent,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await updateConfig({
        last_run_at: new Date().toISOString(),
        last_action: `buy error: ${msg}`.slice(0, 240),
      });
      return { ok: false, action: "error", message: msg, symbol, price };
    }
  }

  await updateConfig({
    last_run_at: new Date().toISOString(),
    last_action: `wait for dip (${changePercent.toFixed(2)}% vs -${threshold}%)`,
  });
  return {
    ok: true,
    action: "hold",
    message: `Waiting in cash. Need -${threshold}% to buy (now ${changePercent.toFixed(2)}%).`,
    symbol,
    price,
    referencePrice: reference,
    changePercent,
  };
}
