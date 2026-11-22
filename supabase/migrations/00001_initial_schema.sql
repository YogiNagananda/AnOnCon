-- ============================================================================
-- Anon Connect - Initial Database Schema
-- Migration: 00001_initial_schema.sql
-- Description: Creates all tables, RLS policies, helper functions, views,
--              triggers, and indexes for the Anon Connect anonymous social app.
-- ============================================================================

-- Enable required extensions
create extension if not exists "pgcrypto";    -- for gen_random_uuid()
create extension if not exists "postgis";     -- for geography types

-- ============================================================================
-- HELPER FUNCTIONS (needed before tables/policies that reference them)
-- ============================================================================

-- get_age_range: converts a date of birth into a bucketed age range string.
-- Used by the public_profiles view so DOB is never exposed directly.
create or replace function public.get_age_range(dob date)
returns text
language sql
immutable
as $$
  select case
    when age(dob) < interval '18 years' then 'under-18'
    when age(dob) < interval '25 years' then '18-24'
    when age(dob) < interval '35 years' then '25-34'
    when age(dob) < interval '45 years' then '35-44'
    else '45+'
  end;
$$;

-- update_updated_at: trigger function to auto-set updated_at on row modification.
create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- handle_new_user: placeholder trigger function for auth.users inserts.
-- In production, this would create the initial profile row.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Placeholder: insert a skeleton profile when a new auth user signs up.
  -- The client must then complete the profile (display_name, dob, etc.).
  return new;
end;
$$;

-- ============================================================================
-- TABLES
-- ============================================================================

-- -------------------------
-- profiles
-- -------------------------
-- COMMENT: Extends auth.users. The PK is the same uuid from auth.users (no gen_random_uuid).
create table public.profiles (
  id                     uuid references auth.users(id) on delete cascade primary key,
  display_name           text unique not null
                           check (char_length(display_name) between 3 and 30),
  display_name_changed_at timestamptz,
  avatar_url             text,
  gender                 text check (gender in ('male','female','non-binary','prefer-not-to-say')),
  dob                    date not null,
  bio                    text check (char_length(bio) <= 500),
  interests              text[],
  languages              text[],
  area                   jsonb,          -- { country, state, city }
  is_visible             boolean default true,
  is_online              boolean default false,
  last_seen_at           timestamptz,
  is_suspended           boolean default false,
  suspended_until        timestamptz,
  is_banned              boolean default false,
  role                   text default 'user' check (role in ('user','admin')),
  created_at             timestamptz default now(),
  updated_at             timestamptz default now()
);

-- -------------------------
-- filter_presets
-- -------------------------
create table public.filter_presets (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references public.profiles(id) on delete cascade,
  name       text not null,
  filters    jsonb not null,   -- { age_min, age_max, gender, area, interests, language }
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- -------------------------
-- connection_requests
-- -------------------------
create table public.connection_requests (
  id           uuid default gen_random_uuid() primary key,
  sender_id    uuid references public.profiles(id) on delete cascade,
  receiver_id  uuid references public.profiles(id) on delete cascade,
  status       text default 'pending'
                 check (status in ('pending','accepted','rejected','expired')),
  intro        text check (char_length(intro) <= 140),
  expires_at   timestamptz default (now() + interval '48 hours'),
  responded_at timestamptz,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- COMMENT: Partial unique index ensures only ONE pending request per sender→receiver pair.
-- Rejected/expired/accepted requests don't block future ones.
create unique index uq_pending_request
  on public.connection_requests (sender_id, receiver_id)
  where status = 'pending';

-- -------------------------
-- chats
-- -------------------------
create table public.chats (
  id                    uuid default gen_random_uuid() primary key,
  participant_1         uuid references public.profiles(id),
  participant_2         uuid references public.profiles(id),
  connection_request_id uuid references public.connection_requests(id),
  is_active             boolean default true,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

-- COMMENT: Unique constraint on participant pair. We store the smaller uuid in
-- participant_1 by convention, enforced at application level or via a trigger.
-- The unique index below covers both orderings.
create unique index uq_chat_participants
  on public.chats (least(participant_1, participant_2), greatest(participant_1, participant_2));

-- -------------------------
-- messages
-- -------------------------
create table public.messages (
  id           uuid default gen_random_uuid() primary key,
  chat_id      uuid references public.chats(id) on delete cascade,
  sender_id    uuid references public.profiles(id),
  content      text not null,
  is_deleted   boolean default false,
  delivered_at timestamptz,
  read_at      timestamptz,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- -------------------------
-- calls
-- -------------------------
create table public.calls (
  id                     uuid default gen_random_uuid() primary key,
  chat_id                uuid references public.chats(id),
  caller_id              uuid references public.profiles(id),
  receiver_id            uuid references public.profiles(id),
  type                   text check (type in ('voice','video')),
  status                 text default 'ringing'
                           check (status in ('ringing','active','ended','declined','missed')),
  started_at             timestamptz,
  ended_at               timestamptz,
  video_enabled_caller   boolean default false,
  video_enabled_receiver boolean default false,
  created_at             timestamptz default now(),
  updated_at             timestamptz default now()
);

-- -------------------------
-- groups
-- -------------------------
create table public.groups (
  id          uuid default gen_random_uuid() primary key,
  name        text not null,
  description text,
  icon_url    text,
  tags        text[],
  is_public   boolean default true,
  max_members int default 200,
  owner_id    uuid references public.profiles(id),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- -------------------------
-- group_members
-- -------------------------
create table public.group_members (
  id         uuid default gen_random_uuid() primary key,
  group_id   uuid references public.groups(id) on delete cascade,
  user_id    uuid references public.profiles(id) on delete cascade,
  role       text default 'member' check (role in ('owner','admin','member')),
  is_muted   boolean default false,
  is_banned  boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (group_id, user_id)
);

-- -------------------------
-- blocks
-- -------------------------
create table public.blocks (
  id         uuid default gen_random_uuid() primary key,
  blocker_id uuid references public.profiles(id) on delete cascade,
  blocked_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (blocker_id, blocked_id)
);

-- -------------------------
-- reports
-- -------------------------
create table public.reports (
  id          uuid default gen_random_uuid() primary key,
  reporter_id uuid references public.profiles(id),
  reported_id uuid references public.profiles(id),
  reason      text not null
                check (reason in ('harassment','spam','underage','inappropriate','other')),
  description text,
  status      text default 'pending'
                check (status in ('pending','reviewing','resolved','dismissed')),
  priority    text default 'normal'
                check (priority in ('normal','high','urgent')),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- COMMENT: Auto-escalate underage reports to urgent priority via trigger.
create or replace function public.auto_escalate_underage_report()
returns trigger
language plpgsql
as $$
begin
  if new.reason = 'underage' then
    new.priority = 'urgent';
  end if;
  return new;
end;
$$;

create trigger trg_auto_escalate_underage
  before insert or update on public.reports
  for each row
  execute function public.auto_escalate_underage_report();

-- -------------------------
-- moderation_actions
-- -------------------------
create table public.moderation_actions (
  id         uuid default gen_random_uuid() primary key,
  admin_id   uuid references public.profiles(id),
  target_id  uuid references public.profiles(id),
  report_id  uuid references public.reports(id),
  action     text check (action in ('warn','suspend','ban','unban','unsuspend')),
  reason     text,
  duration   interval,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- -------------------------
-- nearby_presence
-- -------------------------
-- COMMENT: PK is user_id (one presence record per user, no gen_random_uuid).
create table public.nearby_presence (
  user_id            uuid references public.profiles(id) on delete cascade primary key,
  location           geography(Point, 4326) not null,
  fuzzed_location    geography(Point, 4326),
  radius_preference  int default 500 check (radius_preference in (100, 500, 1000)),
  is_active          boolean default true,
  last_updated_at    timestamptz default now(),
  expires_at         timestamptz default (now() + interval '30 minutes'),
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

-- -------------------------
-- event_zones
-- -------------------------
create table public.event_zones (
  id            uuid default gen_random_uuid() primary key,
  name          text not null,
  description   text,
  organizer_id  uuid references public.profiles(id),
  center        geography(Point, 4326) not null,
  radius_meters int not null,
  join_code     text unique not null,
  is_active     boolean default true,
  starts_at     timestamptz,
  ends_at       timestamptz,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- -------------------------
-- event_zone_members
-- -------------------------
create table public.event_zone_members (
  id         uuid default gen_random_uuid() primary key,
  zone_id    uuid references public.event_zones(id) on delete cascade,
  user_id    uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (zone_id, user_id)
);

-- ============================================================================
-- TRIGGERS: auto-update updated_at on every table that has it
-- ============================================================================

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at();

create trigger trg_filter_presets_updated_at
  before update on public.filter_presets
  for each row execute function public.update_updated_at();

create trigger trg_connection_requests_updated_at
  before update on public.connection_requests
  for each row execute function public.update_updated_at();

create trigger trg_chats_updated_at
  before update on public.chats
  for each row execute function public.update_updated_at();

create trigger trg_messages_updated_at
  before update on public.messages
  for each row execute function public.update_updated_at();

create trigger trg_calls_updated_at
  before update on public.calls
  for each row execute function public.update_updated_at();

create trigger trg_groups_updated_at
  before update on public.groups
  for each row execute function public.update_updated_at();

create trigger trg_group_members_updated_at
  before update on public.group_members
  for each row execute function public.update_updated_at();

create trigger trg_blocks_updated_at
  before update on public.blocks
  for each row execute function public.update_updated_at();

create trigger trg_reports_updated_at
  before update on public.reports
  for each row execute function public.update_updated_at();

create trigger trg_moderation_actions_updated_at
  before update on public.moderation_actions
  for each row execute function public.update_updated_at();

create trigger trg_nearby_presence_updated_at
  before update on public.nearby_presence
  for each row execute function public.update_updated_at();

create trigger trg_event_zones_updated_at
  before update on public.event_zones
  for each row execute function public.update_updated_at();

create trigger trg_event_zone_members_updated_at
  before update on public.event_zone_members
  for each row execute function public.update_updated_at();

-- ============================================================================
-- VIEW: public_profiles
-- ============================================================================
-- COMMENT: This view exposes every profile column EXCEPT dob.
-- Instead it shows age_range (derived from dob via get_age_range).
-- All client queries for discovery / search should use this view.
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
  updated_at
from public.profiles;

-- ============================================================================
-- INDEXES
-- ============================================================================

create index idx_connection_requests_sender   on public.connection_requests (sender_id);
create index idx_connection_requests_receiver on public.connection_requests (receiver_id);
create index idx_connection_requests_status   on public.connection_requests (status);

create index idx_messages_chat_created        on public.messages (chat_id, created_at);

create index idx_blocks_blocker               on public.blocks (blocker_id);
create index idx_blocks_blocked               on public.blocks (blocked_id);

create index idx_nearby_presence_location     on public.nearby_presence using gist (location);

create index idx_profiles_display_name        on public.profiles (display_name);

-- ============================================================================
-- HELPER FUNCTIONS (that reference tables)
-- ============================================================================

-- is_blocked: returns true if either user has blocked the other.
-- Checks both directions in one query.
create or replace function public.is_blocked(user1 uuid, user2 uuid)
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = user1 and blocked_id = user2)
       or (blocker_id = user2 and blocked_id = user1)
  );
$$;

-- expire_connection_requests: marks pending requests past their expires_at as expired.
create or replace function public.expire_connection_requests()
returns void
language sql
as $$
  update public.connection_requests
  set status = 'expired', updated_at = now()
  where status = 'pending' and expires_at < now();
$$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on every table
alter table public.profiles            enable row level security;
alter table public.filter_presets      enable row level security;
alter table public.connection_requests enable row level security;
alter table public.chats               enable row level security;
alter table public.messages            enable row level security;
alter table public.calls               enable row level security;
alter table public.groups              enable row level security;
alter table public.group_members       enable row level security;
alter table public.blocks              enable row level security;
alter table public.reports             enable row level security;
alter table public.moderation_actions  enable row level security;
alter table public.nearby_presence     enable row level security;
alter table public.event_zones         enable row level security;
alter table public.event_zone_members  enable row level security;

-- ============================================================================
-- RLS POLICIES: profiles
-- ============================================================================

-- COMMENT: SELECT - Authenticated users can see any profile that:
--   1. Is not banned
--   2. Is not blocked in either direction (the viewer hasn't blocked the profile,
--      and the profile hasn't blocked the viewer)
-- Note: DOB is in the row but clients should use the public_profiles view.
-- RLS cannot column-mask, so the view is the privacy boundary for DOB.
create policy "profiles_select"
  on public.profiles for select
  to authenticated
  using (
    is_banned = false
    and not public.is_blocked(id, auth.uid())
  );

-- COMMENT: Users see their own profile even if banned (so they can read the ban state).
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

create policy "profiles_insert"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

create policy "profiles_update"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles_delete"
  on public.profiles for delete
  to authenticated
  using (id = auth.uid());

-- ============================================================================
-- RLS POLICIES: filter_presets
-- ============================================================================

create policy "filter_presets_select"
  on public.filter_presets for select
  to authenticated
  using (user_id = auth.uid());

create policy "filter_presets_insert"
  on public.filter_presets for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "filter_presets_update"
  on public.filter_presets for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "filter_presets_delete"
  on public.filter_presets for delete
  to authenticated
  using (user_id = auth.uid());

-- ============================================================================
-- RLS POLICIES: connection_requests
-- ============================================================================

-- COMMENT: INSERT - sender must be auth.uid(), cannot send to self, must not be
-- blocked in either direction, and cannot re-request within 24 hours of a rejection.
-- The partial unique index (uq_pending_request) prevents duplicate pending requests
-- at the DB level; this policy adds the 24-hour cooldown after rejection.
create policy "connection_requests_insert"
  on public.connection_requests for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and sender_id <> receiver_id
    and not public.is_blocked(sender_id, receiver_id)
    and not exists (
      select 1 from public.connection_requests cr
      where cr.sender_id = auth.uid()
        and cr.receiver_id = connection_requests.receiver_id
        and cr.status = 'rejected'
        and cr.responded_at > now() - interval '24 hours'
    )
  );

create policy "connection_requests_select"
  on public.connection_requests for select
  to authenticated
  using (sender_id = auth.uid() or receiver_id = auth.uid());

-- COMMENT: UPDATE - only the receiver can accept or reject, and only while pending.
create policy "connection_requests_update"
  on public.connection_requests for update
  to authenticated
  using (receiver_id = auth.uid() and status = 'pending')
  with check (receiver_id = auth.uid());

-- ============================================================================
-- RLS POLICIES: chats
-- ============================================================================

-- COMMENT: SELECT/UPDATE - only participants of the chat.
create policy "chats_select"
  on public.chats for select
  to authenticated
  using (participant_1 = auth.uid() or participant_2 = auth.uid());

create policy "chats_update"
  on public.chats for update
  to authenticated
  using (participant_1 = auth.uid() or participant_2 = auth.uid());

-- COMMENT: INSERT - only allowed when a connection_request has been accepted.
-- The connection_request_id must reference an accepted request involving auth.uid().
create policy "chats_insert"
  on public.chats for insert
  to authenticated
  with check (
    (participant_1 = auth.uid() or participant_2 = auth.uid())
    and exists (
      select 1 from public.connection_requests cr
      where cr.id = connection_request_id
        and cr.status = 'accepted'
        and (cr.sender_id = auth.uid() or cr.receiver_id = auth.uid())
    )
  );

-- ============================================================================
-- RLS POLICIES: messages
-- ============================================================================

-- COMMENT: SELECT - user must be a participant in the chat the message belongs to.
create policy "messages_select"
  on public.messages for select
  to authenticated
  using (
    exists (
      select 1 from public.chats c
      where c.id = chat_id
        and (c.participant_1 = auth.uid() or c.participant_2 = auth.uid())
    )
  );

-- COMMENT: INSERT - user must be a chat participant AND must be the sender.
create policy "messages_insert"
  on public.messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.chats c
      where c.id = chat_id
        and (c.participant_1 = auth.uid() or c.participant_2 = auth.uid())
    )
  );

-- COMMENT: UPDATE - only the sender can modify their own message
-- (for soft-delete via is_deleted, or setting delivered_at / read_at).
-- We also allow the other participant to set read_at/delivered_at via a
-- separate policy below.
create policy "messages_update_sender"
  on public.messages for update
  to authenticated
  using (sender_id = auth.uid())
  with check (sender_id = auth.uid());

-- COMMENT: Allow the receiver (non-sender participant) to update delivered_at and read_at.
-- RLS cannot restrict which columns are updated, so application logic must enforce
-- that the receiver only sets delivered_at / read_at.
create policy "messages_update_receiver"
  on public.messages for update
  to authenticated
  using (
    sender_id <> auth.uid()
    and exists (
      select 1 from public.chats c
      where c.id = chat_id
        and (c.participant_1 = auth.uid() or c.participant_2 = auth.uid())
    )
  );

-- ============================================================================
-- RLS POLICIES: calls
-- ============================================================================

create policy "calls_select"
  on public.calls for select
  to authenticated
  using (caller_id = auth.uid() or receiver_id = auth.uid());

create policy "calls_insert"
  on public.calls for insert
  to authenticated
  with check (
    caller_id = auth.uid()
    and exists (
      select 1 from public.chats c
      where c.id = chat_id
        and (c.participant_1 = auth.uid() or c.participant_2 = auth.uid())
    )
  );

create policy "calls_update"
  on public.calls for update
  to authenticated
  using (caller_id = auth.uid() or receiver_id = auth.uid());

-- ============================================================================
-- RLS POLICIES: blocks
-- ============================================================================

create policy "blocks_select"
  on public.blocks for select
  to authenticated
  using (blocker_id = auth.uid());

create policy "blocks_insert"
  on public.blocks for insert
  to authenticated
  with check (blocker_id = auth.uid());

create policy "blocks_delete"
  on public.blocks for delete
  to authenticated
  using (blocker_id = auth.uid());

-- ============================================================================
-- RLS POLICIES: reports
-- ============================================================================

-- COMMENT: Users can see their own reports; admins can see all reports.
create policy "reports_select"
  on public.reports for select
  to authenticated
  using (
    reporter_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "reports_insert"
  on public.reports for insert
  to authenticated
  with check (reporter_id = auth.uid());

-- COMMENT: Only admins can update report status.
create policy "reports_update"
  on public.reports for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- ============================================================================
-- RLS POLICIES: moderation_actions
-- ============================================================================

-- COMMENT: Only admins can view and create moderation actions.
create policy "moderation_actions_select"
  on public.moderation_actions for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "moderation_actions_insert"
  on public.moderation_actions for insert
  to authenticated
  with check (
    admin_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- ============================================================================
-- RLS POLICIES: groups
-- ============================================================================

-- COMMENT: Public groups are visible to all authenticated users.
-- Private groups are visible only to members.
create policy "groups_select"
  on public.groups for select
  to authenticated
  using (
    is_public = true
    or owner_id = auth.uid()
    or exists (
      select 1 from public.group_members gm
      where gm.group_id = id and gm.user_id = auth.uid()
    )
  );

create policy "groups_insert"
  on public.groups for insert
  to authenticated
  with check (owner_id = auth.uid());

-- COMMENT: Only the group owner can update group settings.
create policy "groups_update"
  on public.groups for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "groups_delete"
  on public.groups for delete
  to authenticated
  using (owner_id = auth.uid());

-- ============================================================================
-- RLS POLICIES: group_members
-- ============================================================================

-- COMMENT: Members can see the membership list of groups they belong to.
create policy "group_members_select"
  on public.group_members for select
  to authenticated
  using (
    exists (
      select 1 from public.group_members my
      where my.group_id = group_members.group_id and my.user_id = auth.uid()
    )
    or exists (
      select 1 from public.groups g
      where g.id = group_members.group_id and g.is_public = true
    )
  );

-- COMMENT: Users can join public groups themselves or be added by owner/admin.
create policy "group_members_insert"
  on public.group_members for insert
  to authenticated
  with check (
    user_id = auth.uid()
    or exists (
      select 1 from public.group_members gm
      where gm.group_id = group_members.group_id
        and gm.user_id = auth.uid()
        and gm.role in ('owner','admin')
    )
  );

-- COMMENT: Owner/admin can update member roles, mute, ban.
create policy "group_members_update"
  on public.group_members for update
  to authenticated
  using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = group_members.group_id
        and gm.user_id = auth.uid()
        and gm.role in ('owner','admin')
    )
  );

-- COMMENT: Users can leave (delete own membership); owner/admin can remove members.
create policy "group_members_delete"
  on public.group_members for delete
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.group_members gm
      where gm.group_id = group_members.group_id
        and gm.user_id = auth.uid()
        and gm.role in ('owner','admin')
    )
  );

-- ============================================================================
-- RLS POLICIES: nearby_presence
-- ============================================================================

-- COMMENT: Users can see nearby_presence of active, non-blocked users.
create policy "nearby_presence_select"
  on public.nearby_presence for select
  to authenticated
  using (
    is_active = true
    and not public.is_blocked(user_id, auth.uid())
  );

-- Users can always read their own presence record.
create policy "nearby_presence_select_own"
  on public.nearby_presence for select
  to authenticated
  using (user_id = auth.uid());

create policy "nearby_presence_insert"
  on public.nearby_presence for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "nearby_presence_update"
  on public.nearby_presence for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "nearby_presence_delete"
  on public.nearby_presence for delete
  to authenticated
  using (user_id = auth.uid());

-- ============================================================================
-- RLS POLICIES: event_zones
-- ============================================================================

-- COMMENT: Active event zones are visible to all authenticated users.
create policy "event_zones_select"
  on public.event_zones for select
  to authenticated
  using (is_active = true);

create policy "event_zones_insert"
  on public.event_zones for insert
  to authenticated
  with check (organizer_id = auth.uid());

create policy "event_zones_update"
  on public.event_zones for update
  to authenticated
  using (organizer_id = auth.uid())
  with check (organizer_id = auth.uid());

create policy "event_zones_delete"
  on public.event_zones for delete
  to authenticated
  using (organizer_id = auth.uid());

-- ============================================================================
-- RLS POLICIES: event_zone_members
-- ============================================================================

-- COMMENT: Members of a zone can see other members; organizer can see all.
create policy "event_zone_members_select"
  on public.event_zone_members for select
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.event_zone_members ezm
      where ezm.zone_id = event_zone_members.zone_id and ezm.user_id = auth.uid()
    )
    or exists (
      select 1 from public.event_zones ez
      where ez.id = event_zone_members.zone_id and ez.organizer_id = auth.uid()
    )
  );

create policy "event_zone_members_insert"
  on public.event_zone_members for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "event_zone_members_delete"
  on public.event_zone_members for delete
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.event_zones ez
      where ez.id = event_zone_members.zone_id and ez.organizer_id = auth.uid()
    )
  );

-- ============================================================================
-- END OF MIGRATION 00001
-- ============================================================================
