-- Daebak - Anonymous Question Inbox (Supabase)
-- Run this once in Supabase > SQL Editor. SAFE TO RE-RUN: it adds the display-id columns,
-- sequence, trigger, and backfills existing rows if the table already exists.
-- Then put SUPABASE_URL + SUPABASE_SERVICE_KEY in env (Vercel project + local admin).
--
-- Security: RLS ON, NO public policies - only the service_role key (server-side) can read/write.
-- Status pages are reachable only with the unguessable public_token. display_id is NOT a lookup key.

create extension if not exists "pgcrypto";

create table if not exists public.questions (
  id                  uuid primary key default gen_random_uuid(),
  question            text not null,
  normalized_question text,
  language            text,
  category_guess      text,
  intent_guess        text,
  email               text,
  name                text,
  source_page         text,
  source_component    text,
  status              text not null default 'new',
  priority            text not null default 'normal',
  admin_notes         text,
  answer_draft_id     text,
  published_url       text,
  answer_summary      text,
  public_token        text not null unique,
  question_number     bigint,
  display_id          text,
  notify_on_answer    boolean not null default false,
  notification_status text not null default 'none',
  notified_at         timestamptz,
  ip_hash             text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Add the display-id columns to an existing table (no-op if already present).
alter table public.questions add column if not exists question_number bigint;
alter table public.questions add column if not exists display_id text;

create index if not exists questions_status_idx     on public.questions (status);
create index if not exists questions_created_idx     on public.questions (created_at desc);
create index if not exists questions_token_idx       on public.questions (public_token);
create index if not exists questions_iphash_time_idx on public.questions (ip_hash, created_at desc);
create index if not exists questions_display_idx     on public.questions (display_id);

-- Sequence for the display-only question number.
create sequence if not exists public.questions_qnum_seq;

-- Backfill existing rows (assign numbers in created_at order); only fills missing ones.
with ordered as (
  select id, row_number() over (order by created_at, id) as rn
  from public.questions
  where question_number is null
)
update public.questions q
set question_number = o.rn,
    display_id = 'Question ' || lpad(o.rn::text, 6, '0')
from ordered o
where q.id = o.id;

-- Move the sequence past the current max (next nextval returns max+1).
select setval(
  'public.questions_qnum_seq',
  coalesce((select max(question_number) from public.questions), 0) + 1,
  false
);

-- Assign question_number + display_id on every new insert (BEFORE INSERT trigger).
create or replace function public.questions_assign_number() returns trigger as $$
begin
  if new.question_number is null then
    new.question_number := nextval('public.questions_qnum_seq');
  end if;
  new.display_id := 'Question ' || lpad(new.question_number::text, 6, '0');
  return new;
end;
$$ language plpgsql;

drop trigger if exists questions_assign_number on public.questions;
create trigger questions_assign_number
  before insert on public.questions
  for each row execute function public.questions_assign_number();

-- Lock down: RLS on, no policies -> only the service_role key works.
alter table public.questions enable row level security;

-- Keep updated_at fresh.
create or replace function public.touch_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists questions_touch on public.questions;
create trigger questions_touch
  before update on public.questions
  for each row execute function public.touch_updated_at();
