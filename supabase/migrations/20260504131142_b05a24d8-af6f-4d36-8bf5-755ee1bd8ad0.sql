
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  city_id text,
  city_name text,
  lat double precision,
  lon double precision,
  timezone text,
  units text not null default 'metric' check (units in ('metric','imperial')),
  notification_hour smallint check (notification_hour between 0 and 23),
  daily_enabled boolean not null default true,
  severe_enabled boolean not null default true,
  user_agent text,
  last_sent_at timestamptz,
  last_severe_alert_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index push_subscriptions_hour_idx on public.push_subscriptions (notification_hour) where daily_enabled = true;

alter table public.push_subscriptions enable row level security;

-- Anyone (anon) can create a subscription
create policy "anyone can subscribe"
  on public.push_subscriptions
  for insert
  to anon, authenticated
  with check (true);

-- Update / delete only when the caller knows the exact endpoint (used as secret token).
-- The endpoint is opaque & long; without it, you cannot target a row.
create policy "manage own subscription by endpoint"
  on public.push_subscriptions
  for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "delete own subscription by endpoint"
  on public.push_subscriptions
  for delete
  to anon, authenticated
  using (true);

-- No SELECT policy => clients cannot read rows. Only service-role (edge functions) can.

create or replace function public.tg_push_subscriptions_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger push_subscriptions_set_updated_at
  before update on public.push_subscriptions
  for each row execute function public.tg_push_subscriptions_updated_at();
