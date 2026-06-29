-- Daebak — Anonymous Question Inbox (Supabase)
-- Run this once in Supabase → SQL Editor. SAFE TO RE-RUN: it adds the display-id columns,
-- sequence, trigger, and backfills existing rows if the table already exists.
-- Then put SUPABASE_URL + SUPABASE_SERVICE_KEY in env (Vercel project + local admin).
--
-- Security: RLS ON, NO public policies → only the service_role key (server-side) can read/write.
-- Status pages are reachable only with the unguessable public_token. display_id is NOT a lookup key.

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
  question_number     bigint,                    -- display-only sequential number (set by trigger)
  display_id          text,                      -- "Question 000001" (derived from question_number)
  notify_on_answer    boolean not null default false,
  notification_status text not null default 'none', -- none|pending|sent|failed
  notified_at         timestamptz,
  ip_hash             text,                      -- sha256(ip+salt); for rate-limit only, not the raw IP
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- 이미 만든 테이블에도 표시용 번호 컬럼 추가(없을 때만)
alter table public.questions add column if not exists question_number bigint;
alter table public.questions add column if not exists display_id text;

create index if not exists questions_status_idx     on public.questions (status);
create index if not exists questions_created_idx     on public.questions (created_at desc);
create index if not exists questions_token_idx       on public.questions (public_token);
create index if not exists questions_iphash_time_idx on public.questions (ip_hash, created_at desc);
create index if not exists questions_display_idx     on public.questions (display_id);

-- 표시용 번호 시퀀스
create sequence if not exists public.questions_qnum_seq;

-- 기존 행 백필(created_at 순서로 번호 부여) — 처음 실행 시 또는 누락분만
with ordered as (
  select id, row_number() over (order by created_at, id) as rn
  from public.questions where question_number is null
)
update public.questions q
set question_number = o.rn,
    display_id = 'Question ' || lpad(o.rn::text, 6, '0')
from ordered o
where q.id = o.id;

-- 시퀀스를 현재 최대 번호 다음으로 맞춤(다음 nextval 이 max+1 을 반환)
select setval('public.questions_qnum_seq',
              coalesce((select max(question_number) from public.questions), 0) + 1, false);

-- 새 질문마다 번호 + displayId 자동 부여(BEFORE INSERT)
create or replace function public.questions_assign_number() returns trigger as $$
begin
  if new.question_number is null then
    new.question_number := nextval('public.questions_qnum_seq');
  end if;
  new.display_id := 'Question ' || lpad(new.question_number::text, 6, '0');
  return new;
end; $$ language plpgsql;

drop trigger if exists questions_assign_number on public.questions;
create trigger questions_assign_number before insert on public.questions
  for each row execute function public.questions_assign_number();

-- 잠금: RLS on, 정책 없음 → service_role 만 접근
alter table public.questions enable row level security;

-- updated_at 자동 갱신
create or replace function public.touch_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end; $$ language plpgsql;

drop trigger if exists questions_touch on public.questions;
create trigger questions_touch before update on public.questions
  for each row execute function public.touch_updated_at();
