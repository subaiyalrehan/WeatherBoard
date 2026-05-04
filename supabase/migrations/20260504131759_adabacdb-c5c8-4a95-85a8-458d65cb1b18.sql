
-- Fix function search_path
create or replace function public.tg_push_subscriptions_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin new.updated_at = now(); return new; end $$;

-- Replace permissive policies with endpoint-matching ones.
-- Clients must send header "x-endpoint: <their endpoint>" via PostgREST
-- (forwarded as request.header.x-endpoint in current_setting).
drop policy if exists "manage own subscription by endpoint" on public.push_subscriptions;
drop policy if exists "delete own subscription by endpoint" on public.push_subscriptions;

create policy "update own subscription by endpoint header"
  on public.push_subscriptions
  for update
  to anon, authenticated
  using (endpoint = current_setting('request.headers', true)::json->>'x-endpoint')
  with check (endpoint = current_setting('request.headers', true)::json->>'x-endpoint');

create policy "delete own subscription by endpoint header"
  on public.push_subscriptions
  for delete
  to anon, authenticated
  using (endpoint = current_setting('request.headers', true)::json->>'x-endpoint');
