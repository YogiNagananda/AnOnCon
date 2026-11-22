-- ============================================================================
-- Anon Connect - Database Functions
-- Migration: 00003_functions.sql
-- Description: Application-level database functions for profile search,
--              nearby user discovery, request lifecycle, and presence cleanup.
-- ============================================================================

-- ============================================================================
-- search_profiles
-- ============================================================================
-- COMMENT: Full-featured profile search with optional filters.
-- Accepts a JSON object with optional keys:
--   age_min (int), age_max (int), gender (text), area (jsonb with country/state/city),
--   interests (text[]), language (text)
-- Excludes blocked users, banned users, and non-visible profiles.
-- Returns public_profiles columns (never raw dob).
create or replace function public.search_profiles(
  filters jsonb,
  requesting_user uuid
)
returns table (
  id                     uuid,
  display_name           text,
  display_name_changed_at timestamptz,
  avatar_url             text,
  gender                 text,
  age_range              text,
  bio                    text,
  interests              text[],
  languages              text[],
  area                   jsonb,
  is_visible             boolean,
  is_online              boolean,
  last_seen_at           timestamptz,
  created_at             timestamptz
)
language plpgsql
stable
security definer
as $$
declare
  v_age_min    int;
  v_age_max    int;
  v_gender     text;
  v_area       jsonb;
  v_interests  text[];
  v_language   text;
begin
  -- Extract filter values (all optional)
  v_age_min   := (filters->>'age_min')::int;
  v_age_max   := (filters->>'age_max')::int;
  v_gender    := filters->>'gender';
  v_area      := filters->'area';
  v_interests := array(select jsonb_array_elements_text(filters->'interests'))
                   where filters->'interests' is not null;
  v_language  := filters->>'language';

  return query
  select
    p.id,
    p.display_name,
    p.display_name_changed_at,
    p.avatar_url,
    p.gender,
    public.get_age_range(p.dob) as age_range,
    p.bio,
    p.interests,
    p.languages,
    p.area,
    p.is_visible,
    p.is_online,
    p.last_seen_at,
    p.created_at
  from public.profiles p
  where
    -- Exclude self
    p.id <> requesting_user
    -- Must be visible and not banned/suspended
    and p.is_visible = true
    and p.is_banned = false
    and p.is_suspended = false
    -- Exclude blocked users (both directions)
    and not public.is_blocked(p.id, requesting_user)
    -- Age range filter: compute age from dob
    and (
      v_age_min is null
      or extract(year from age(p.dob))::int >= v_age_min
    )
    and (
      v_age_max is null
      or extract(year from age(p.dob))::int <= v_age_max
    )
    -- Gender filter
    and (v_gender is null or p.gender = v_gender)
    -- Area filter: match on country, optionally state and city
    and (
      v_area is null
      or (
        (v_area->>'country' is null or p.area->>'country' = v_area->>'country')
        and (v_area->>'state' is null or p.area->>'state' = v_area->>'state')
        and (v_area->>'city' is null or p.area->>'city' = v_area->>'city')
      )
    )
    -- Interests filter: profile must have at least one matching interest
    and (
      v_interests is null
      or cardinality(v_interests) = 0
      or p.interests && v_interests
    )
    -- Language filter: profile must list the requested language
    and (
      v_language is null
      or v_language = any(p.languages)
    )
  order by p.last_seen_at desc nulls last;
end;
$$;

-- ============================================================================
-- get_nearby_users
-- ============================================================================
-- COMMENT: Returns nearby users within a given radius (meters) of a geography point.
-- Excludes blocked users, inactive presence, and expired entries.
-- Uses PostGIS ST_DWithin for index-accelerated distance queries.
create or replace function public.get_nearby_users(
  user_location geography,
  radius int,
  requesting_user uuid
)
returns table (
  user_id          uuid,
  display_name     text,
  avatar_url       text,
  age_range        text,
  fuzzed_location  geography,
  distance_meters  double precision
)
language plpgsql
stable
security definer
as $$
begin
  return query
  select
    np.user_id,
    p.display_name,
    p.avatar_url,
    public.get_age_range(p.dob) as age_range,
    -- COMMENT: Return the fuzzed (grid-snapped) location, never the exact one,
    -- to protect user privacy.
    np.fuzzed_location,
    ST_Distance(user_location, np.fuzzed_location) as distance_meters
  from public.nearby_presence np
  join public.profiles p on p.id = np.user_id
  where
    -- Only active, non-expired presence
    np.is_active = true
    and np.expires_at > now()
    -- Exclude self
    and np.user_id <> requesting_user
    -- Exclude blocked users
    and not public.is_blocked(np.user_id, requesting_user)
    -- Exclude banned / suspended users
    and p.is_banned = false
    and p.is_suspended = false
    and p.is_visible = true
    -- Within radius (uses GIST index on location)
    and ST_DWithin(user_location, np.fuzzed_location, radius)
  order by distance_meters asc;
end;
$$;

-- ============================================================================
-- cleanup_expired_requests
-- ============================================================================
-- COMMENT: Marks all pending connection requests that have passed their
-- expires_at timestamp as 'expired'. Designed to be called by a pg_cron job
-- or Supabase Edge Function on a schedule (e.g., every 5 minutes).
create or replace function public.cleanup_expired_requests()
returns int
language plpgsql
as $$
declare
  affected int;
begin
  update public.connection_requests
  set
    status = 'expired',
    updated_at = now()
  where status = 'pending'
    and expires_at < now();

  get diagnostics affected = row_count;
  return affected;
end;
$$;

-- ============================================================================
-- cleanup_expired_presence
-- ============================================================================
-- COMMENT: Deletes nearby_presence entries whose expires_at has passed
-- (default 30-minute TTL). Designed for scheduled execution.
create or replace function public.cleanup_expired_presence()
returns int
language plpgsql
as $$
declare
  affected int;
begin
  delete from public.nearby_presence
  where expires_at < now();

  get diagnostics affected = row_count;
  return affected;
end;
$$;

-- ============================================================================
-- can_send_request
-- ============================================================================
-- COMMENT: Pre-flight check before sending a connection request.
-- Returns true if the sender is allowed to send a request to the receiver.
-- Checks:
--   1. Not blocked in either direction
--   2. No pending request already exists (sender → receiver)
--   3. No rejection within the last 24 hours (sender → receiver)
--   4. Receiver is not banned or suspended
create or replace function public.can_send_request(
  sender uuid,
  receiver uuid
)
returns boolean
language plpgsql
stable
security definer
as $$
declare
  v_blocked       boolean;
  v_pending       boolean;
  v_recent_reject boolean;
  v_receiver_ok   boolean;
begin
  -- 1. Check block status
  v_blocked := public.is_blocked(sender, receiver);
  if v_blocked then
    return false;
  end if;

  -- 2. Check for existing pending request
  select exists (
    select 1 from public.connection_requests
    where sender_id = sender
      and receiver_id = receiver
      and status = 'pending'
  ) into v_pending;
  if v_pending then
    return false;
  end if;

  -- 3. Check for recent rejection (within 24 hours)
  select exists (
    select 1 from public.connection_requests
    where sender_id = sender
      and receiver_id = receiver
      and status = 'rejected'
      and responded_at > now() - interval '24 hours'
  ) into v_recent_reject;
  if v_recent_reject then
    return false;
  end if;

  -- 4. Check receiver is not banned or suspended
  select exists (
    select 1 from public.profiles
    where id = receiver
      and is_banned = false
      and is_suspended = false
  ) into v_receiver_ok;

  return v_receiver_ok;
end;
$$;

-- ============================================================================
-- END OF MIGRATION 00003
-- ============================================================================
