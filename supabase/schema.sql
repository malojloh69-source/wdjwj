-- Run once in Supabase Dashboard -> SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[0-9]{6}$'),
  creator_id bigint not null,
  participant_id bigint,
  type text not null check (type in ('buy', 'sell')),
  currency text not null,
  amount text not null,
  price text not null default 'Не указано',
  partner text not null default 'Не указан',
  comment text not null default 'Без комментария',
  status text not null default 'unpaid' check (status in ('unpaid', 'paid', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists deals_creator_id_idx on public.deals (creator_id);
create index if not exists deals_participant_id_idx on public.deals (participant_id);
create index if not exists deals_status_idx on public.deals (status);

alter table public.deals enable row level security;
revoke all on table public.deals from anon, authenticated;
-- The Edge Function uses SUPABASE_SERVICE_ROLE_KEY. The browser never receives direct table access.
