-- RuleFive database schema.
-- Run this once in the Supabase SQL editor (Dashboard → SQL → New query).

-- Single-row table holding the bot configuration and live state.
create table if not exists public.bot_config (
  id int primary key default 1,
  symbol text not null default 'AVAX/USD',
  threshold_percent numeric not null default 5,
  enabled boolean not null default false,
  reference_price numeric,
  last_run_at timestamptz,
  last_action text,
  manual_invested_override numeric,
  updated_at timestamptz default now(),
  constraint bot_config_single_row check (id = 1)
);

-- Seed the single row if the table is empty.
insert into public.bot_config (id)
values (1)
on conflict (id) do nothing;

-- Append-only log of trades the bot has placed (for the dashboard feed).
create table if not exists public.trade_log (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  side text not null,
  symbol text not null,
  price numeric,
  qty numeric,
  notional numeric,
  reason text,
  alpaca_order_id text
);

create index if not exists trade_log_created_at_idx
  on public.trade_log (created_at desc);

-- This app talks to Supabase only with the service-role key from server-side
-- code, so row level security is left disabled. Never expose the service-role
-- key to the browser.
