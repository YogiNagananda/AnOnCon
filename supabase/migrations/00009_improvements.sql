-- ============================================================================
-- Migration 00009: Performance Indexes, Mood Status, Read Receipts & Reactions
-- ============================================================================

-- 1. Performance Indexes
create index if not exists idx_messages_unread
  on public.messages (chat_id, sender_id, read_at)
  where read_at is null and is_deleted = false;

create index if not exists idx_chats_participant_1
  on public.chats (participant_1)
  where is_active = true;

create index if not exists idx_chats_participant_2
  on public.chats (participant_2)
  where is_active = true;

create index if not exists idx_chats_updated_at
  on public.chats (updated_at desc);

create index if not exists idx_group_messages_group_created
  on public.group_messages (group_id, created_at desc);

create index if not exists idx_group_members_user_status
  on public.group_members (user_id, status);

create index if not exists idx_calls_receiver_status
  on public.calls (receiver_id, status)
  where status in ('ringing', 'active');

create index if not exists idx_calls_chat_status
  on public.calls (chat_id, status);

create index if not exists idx_profiles_discovery
  on public.profiles (is_visible, is_banned, is_suspended, last_seen_at desc);

create index if not exists idx_reports_status_priority
  on public.reports (status, priority, created_at desc);

create index if not exists idx_connection_requests_receiver_pending
  on public.connection_requests (receiver_id, created_at desc)
  where status = 'pending';

-- 2. Profile Columns: Mood Status & Read Receipts Visibility
alter table public.profiles
  add column if not exists mood_status text check (char_length(mood_status) <= 60),
  add column if not exists mood_updated_at timestamptz,
  add column if not exists read_receipts_visible boolean default true;

-- 3. Recreate public_profiles view (appending new columns at the end)
create or replace view public.public_profiles as
select
  id,
  display_name,
  display_name_changed_at,
  avatar_url,
  gender,
  public.get_age_range(dob) as age_range,
  bio,
  interests,
  languages,
  area,
  is_visible,
  is_online,
  last_seen_at,
  is_suspended,
  suspended_until,
  is_banned,
  role,
  created_at,
  updated_at,
  mood_status,
  mood_updated_at,
  read_receipts_visible
from public.profiles;

-- 4. Message Reactions Table & RLS Policies
create table if not exists public.message_reactions (
  id         uuid default gen_random_uuid() primary key,
  message_id uuid references public.messages(id) on delete cascade not null,
  user_id    uuid references public.profiles(id) on delete cascade not null,
  emoji      text not null check (char_length(emoji) between 1 and 16),
  created_at timestamptz default now(),
  unique (message_id, user_id, emoji)
);

create index if not exists idx_message_reactions_message
  on public.message_reactions (message_id);

alter table public.message_reactions enable row level security;

drop policy if exists "message_reactions_select" on public.message_reactions;
create policy "message_reactions_select"
  on public.message_reactions for select
  to authenticated
  using (
    exists (
      select 1
      from public.messages m
      join public.chats c on c.id = m.chat_id
      where m.id = message_reactions.message_id
        and c.is_active = true
        and (c.participant_1 = auth.uid() or c.participant_2 = auth.uid())
        and not public.is_blocked(c.participant_1, c.participant_2)
    )
  );

drop policy if exists "message_reactions_insert" on public.message_reactions;
create policy "message_reactions_insert"
  on public.message_reactions for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.messages m
      join public.chats c on c.id = m.chat_id
      where m.id = message_reactions.message_id
        and c.is_active = true
        and (c.participant_1 = auth.uid() or c.participant_2 = auth.uid())
        and not public.is_blocked(c.participant_1, c.participant_2)
    )
  );

drop policy if exists "message_reactions_delete" on public.message_reactions;
create policy "message_reactions_delete"
  on public.message_reactions for delete
  to authenticated
  using (user_id = auth.uid());
