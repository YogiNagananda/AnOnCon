-- ============================================================
-- PHASE 4: Nearby Mode and Event Zones
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/erlixvpvdjxnwtuzmhak/sql
-- ============================================================

CREATE EXTENSION IF NOT EXISTS postgis;

-- ─── 1. NEARBY PRESENCE TABLE ─────────────────────────────────

CREATE TABLE IF NOT EXISTS public.nearby_presence (
  user_id            uuid REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
  location           geography(Point, 4326) NOT NULL,
  fuzzed_location    geography(Point, 4326),
  radius_preference  int DEFAULT 500 CHECK (radius_preference IN (100, 500, 1000)),
  is_active          boolean DEFAULT true,
  last_updated_at    timestamptz DEFAULT now(),
  expires_at         timestamptz DEFAULT (now() + interval '30 minutes'),
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now()
);

ALTER TABLE public.nearby_presence ADD COLUMN IF NOT EXISTS radius_preference int DEFAULT 500;
ALTER TABLE public.nearby_presence ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE public.nearby_presence ADD COLUMN IF NOT EXISTS expires_at timestamptz DEFAULT (now() + interval '30 minutes');

CREATE INDEX IF NOT EXISTS idx_nearby_presence_fuzzed ON public.nearby_presence USING gist(fuzzed_location);
CREATE INDEX IF NOT EXISTS idx_nearby_presence_active ON public.nearby_presence(is_active, expires_at);

-- ─── 2. EVENT ZONES TABLE ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.event_zones (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name          text NOT NULL,
  description   text,
  organizer_id  uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  center        geography(Point, 4326) NOT NULL,
  radius_meters int NOT NULL CHECK (radius_meters BETWEEN 50 AND 2000),
  join_code     text UNIQUE NOT NULL,
  is_active     boolean DEFAULT true,
  starts_at     timestamptz,
  ends_at       timestamptz,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

ALTER TABLE public.event_zones ADD COLUMN IF NOT EXISTS join_code text;
ALTER TABLE public.event_zones ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_event_zones_center ON public.event_zones USING gist(center);
CREATE INDEX IF NOT EXISTS idx_event_zones_code   ON public.event_zones(join_code);

-- ─── 3. EVENT ZONE MEMBERS TABLE ──────────────────────────────

CREATE TABLE IF NOT EXISTS public.event_zone_members (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  zone_id    uuid REFERENCES public.event_zones(id) ON DELETE CASCADE,
  user_id    uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_banned  boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (zone_id, user_id)
);

ALTER TABLE public.event_zone_members ADD COLUMN IF NOT EXISTS is_banned boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_ezm_zone ON public.event_zone_members(zone_id);
CREATE INDEX IF NOT EXISTS idx_ezm_user ON public.event_zone_members(user_id);

-- ─── 4. PRIVACY-PRESERVING POSTGIS FUNCTIONS ──────────────────

-- Returns anonymous profile cards within chosen radius with DISTANCE BANDS ONLY
-- Zero coordinates or exact distance numbers returned to clients
CREATE OR REPLACE FUNCTION public.find_nearby_users(
  p_user_id uuid,
  p_lat double precision,
  p_lon double precision,
  p_radius_meters int DEFAULT 500
)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  avatar_url text,
  age_range text,
  gender text,
  bio text,
  interests text[],
  distance_band text,
  last_seen_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_pt geography;
BEGIN
  -- Cleanup expired or inactive presences automatically
  DELETE FROM nearby_presence WHERE expires_at < now() OR is_active = false;

  v_user_pt := ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography;

  RETURN QUERY
  SELECT
    p.id AS user_id,
    p.display_name,
    p.avatar_url,
    p.age_range,
    p.gender,
    p.bio,
    p.interests,
    CASE
      WHEN ST_Distance(np.fuzzed_location, v_user_pt) <= 100 THEN 'within 100 m'
      WHEN ST_Distance(np.fuzzed_location, v_user_pt) <= 500 THEN 'within 500 m'
      ELSE 'within 1 km'
    END AS distance_band,
    np.last_updated_at AS last_seen_at
  FROM nearby_presence np
  JOIN public_profiles p ON p.id = np.user_id
  WHERE np.user_id != p_user_id
    AND np.is_active = true
    AND np.expires_at > now()
    AND p.is_visible = true
    AND p.is_banned = false
    AND p.is_suspended = false
    AND ST_DWithin(np.fuzzed_location, v_user_pt, p_radius_meters)
    AND NOT EXISTS (
      SELECT 1 FROM blocks b
      WHERE (b.blocker_id = p_user_id AND b.blocked_id = np.user_id)
         OR (b.blocker_id = np.user_id AND b.blocked_id = p_user_id)
    )
  ORDER BY ST_Distance(np.fuzzed_location, v_user_pt) ASC
  LIMIT 50;
END;
$$;

-- Returns members inside an event zone without leaking coordinates or blocked users
CREATE OR REPLACE FUNCTION public.get_zone_members_list(
  p_zone_id uuid,
  p_user_id uuid
)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  avatar_url text,
  age_range text,
  gender text,
  bio text,
  interests text[],
  is_banned boolean,
  joined_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id AS user_id,
    p.display_name,
    p.avatar_url,
    p.age_range,
    p.gender,
    p.bio,
    p.interests,
    ezm.is_banned,
    ezm.created_at AS joined_at
  FROM event_zone_members ezm
  JOIN public_profiles p ON p.id = ezm.user_id
  WHERE ezm.zone_id = p_zone_id
    AND ezm.is_banned = false
    AND NOT EXISTS (
      SELECT 1 FROM blocks b
      WHERE (b.blocker_id = p_user_id AND b.blocked_id = ezm.user_id)
         OR (b.blocker_id = ezm.user_id AND b.blocked_id = p_user_id)
    )
  ORDER BY ezm.created_at DESC;
END;
$$;

-- ─── 5. RLS POLICIES ──────────────────────────────────────────

ALTER TABLE public.nearby_presence   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_zones       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_zone_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "nearby_presence_select" ON public.nearby_presence;
DROP POLICY IF EXISTS "nearby_presence_insert" ON public.nearby_presence;
DROP POLICY IF EXISTS "nearby_presence_update" ON public.nearby_presence;
DROP POLICY IF EXISTS "nearby_presence_delete" ON public.nearby_presence;

-- Users can only read their own presence directly from table (all proximity queries go through find_nearby_users)
CREATE POLICY "nearby_presence_select" ON public.nearby_presence FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "nearby_presence_insert" ON public.nearby_presence FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "nearby_presence_update" ON public.nearby_presence FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "nearby_presence_delete" ON public.nearby_presence FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Event zones policies
DROP POLICY IF EXISTS "event_zones_select" ON public.event_zones;
DROP POLICY IF EXISTS "event_zones_insert" ON public.event_zones;
DROP POLICY IF EXISTS "event_zones_update" ON public.event_zones;
DROP POLICY IF EXISTS "event_zones_delete" ON public.event_zones;

CREATE POLICY "event_zones_select" ON public.event_zones FOR SELECT TO authenticated
  USING (is_active = true AND (ends_at IS NULL OR ends_at > now()));

CREATE POLICY "event_zones_insert" ON public.event_zones FOR INSERT TO authenticated
  WITH CHECK (organizer_id = auth.uid());

CREATE POLICY "event_zones_update" ON public.event_zones FOR UPDATE TO authenticated
  USING (organizer_id = auth.uid());

CREATE POLICY "event_zones_delete" ON public.event_zones FOR DELETE TO authenticated
  USING (organizer_id = auth.uid());

-- Event zone members policies
DROP POLICY IF EXISTS "ezm_select" ON public.event_zone_members;
DROP POLICY IF EXISTS "ezm_insert" ON public.event_zone_members;
DROP POLICY IF EXISTS "ezm_update" ON public.event_zone_members;
DROP POLICY IF EXISTS "ezm_delete" ON public.event_zone_members;

CREATE POLICY "ezm_select" ON public.event_zone_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.event_zone_members my_mem
    WHERE my_mem.zone_id = zone_id AND my_mem.user_id = auth.uid() AND my_mem.is_banned = false
  ));

CREATE POLICY "ezm_insert" ON public.event_zone_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "ezm_update" ON public.event_zone_members FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.event_zones ez
    WHERE ez.id = zone_id AND ez.organizer_id = auth.uid()
  ));

CREATE POLICY "ezm_delete" ON public.event_zone_members FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.event_zones ez
    WHERE ez.id = zone_id AND ez.organizer_id = auth.uid()
  ));
