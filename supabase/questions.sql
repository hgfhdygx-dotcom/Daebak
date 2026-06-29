-- Daebak — Anonymous Question Inbox (Supabase)
-- Run this once in Supabase → SQL Editor. Then put SUPABASE_URL + SUPABASE_SERVICE_KEY in env
-- (Vercel project env for the site, and .env / settings.json for the local admin).
--
-- Security model: RLS is ON with NO public policies → only the service_role key can read/write.
-- The site (/api/ask, /questions/status) and the admin both use the service_role key SERVER-SIDE only.
-- The browser never sees the key; status pages are reachable only with the unguessable public_token.

create extension if not exists "pgcrypto";

create table if not exists public.questions (
  id                  uuid primary key default gen_random_uuid(),
  question            text not null,
  normalized_question text,
  language            text,
  category_guess      text,
  intent_guess        text,                      -- shopping | kbeauty | travel_essential | local_place | product | other
  email               text,
  name                text,
  source_page         text,
  source_component    text,                      -- home_search | search_page | answer_page | category_page | ask_page
  status              text not null default 'new',   -- new|reviewing|answered|draft_created|published|rejected|spam
  priority            text not null default 'normal',-- low|normal|high
  admin_notes         text,
  answer_draft_id     text,
  published_url       text,
  answer_summary      text,
  public_token        text not null unique,      -- unguessable; only way to view status
  notify_on_answer    boolean not null default false,
  notification_status text not null default 'none', -- none|pending|sent|failed
  notified_at         timestamptz,
  ip_hash             text,                      -- sha256(ip+salt); for rate-limit only, not the raw IP
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists questions_status_idx     on public.questions (status);
create index if not exists questions_created_idx     on public.questions (created_at desc);
create index if not exists questions_token_idx       on public.questions (public_token);
create index if not exists questions_iphash_time_idx on public.questions (ip_hash, created_at desc);

-- Lock the table down: RLS on, no policies → anon/public keys get nothing; service_role bypasses RLS.
alter table public.questions enable row level security;

-- keep updated_at fresh
create or replace function public.touch_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end; $$ language plpgsql;

drop trigger if exists questions_touch on public.questions;
create trigger questions_touch before update on public.questions
  for each row execute function public.touch_updated_at();
