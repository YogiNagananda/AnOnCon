-- ============================================================
-- PHASE 3: Groups + Calls Migration (Non-Recursive RLS)
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/erlixvpvdjxnwtuzmhak/sql
-- ============================================================

-- ─── GROUPS TABLE ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS groups (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 60),
  description text CHECK (char_length(description) <= 500),
  icon_url    text,
  tags        text[] DEFAULT '{}',
  is_public   boolean NOT NULL DEFAULT true,
  max_members int NOT NULL DEFAULT 200 CHECK (max_members BETWEEN 2 AND 500),
  owner_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE groups ADD COLUMN IF NOT EXISTS max_members int NOT NULL DEFAULT 200;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';
ALTER TABLE groups ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_groups_owner ON groups(owner_id);
CREATE INDEX IF NOT EXISTS idx_groups_public ON groups(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_groups_tags   ON groups USING gin(tags);

-- ─── GROUP MEMBERS ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS group_members (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id   uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       text NOT NULL DEFAULT 'member' CHECK (role IN ('owner','admin','member')),
  status     text NOT NULL DEFAULT 'active' CHECK (status IN ('active','pending','banned')),
  is_muted   boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

ALTER TABLE group_members ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
ALTER TABLE group_members ADD COLUMN IF NOT EXISTS is_muted boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_group_members_group  ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user   ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_status ON group_members(group_id, status);

-- ─── GROUP MESSAGES ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS group_messages (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id   uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  sender_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content    text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_group_messages_group  ON group_messages(group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_messages_sender ON group_messages(sender_id);

-- ─── CALLS TABLE ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS calls (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id              uuid NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  caller_id            uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type                 text NOT NULL DEFAULT 'voice' CHECK (type IN ('voice','video')),
  status               text NOT NULL DEFAULT 'ringing' CHECK (status IN ('ringing','active','ended','declined','missed')),
  livekit_room_name    text,
  started_at           timestamptz,
  ended_at             timestamptz,
  video_enabled_caller   boolean NOT NULL DEFAULT false,
  video_enabled_receiver boolean NOT NULL DEFAULT false,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE calls ADD COLUMN IF NOT EXISTS livekit_room_name text;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS video_enabled_caller boolean NOT NULL DEFAULT false;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS video_enabled_receiver boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_calls_chat     ON calls(chat_id);
CREATE INDEX IF NOT EXISTS idx_calls_caller   ON calls(caller_id);
CREATE INDEX IF NOT EXISTS idx_calls_receiver ON calls(receiver_id);
CREATE INDEX IF NOT EXISTS idx_calls_status   ON calls(status) WHERE status IN ('ringing','active');

-- ─── GROUP INVITE LINKS ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS group_invites (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id   uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token      text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  expires_at timestamptz,
  max_uses   int,
  use_count  int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_group_invites_token ON group_invites(token);

-- ─── SECURITY DEFINER HELPERS (PREVENT RLS INFINITE RECURSION) ───

CREATE OR REPLACE FUNCTION public.is_group_member(_group_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = _group_id AND user_id = _user_id AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_group_admin(_group_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = _group_id AND user_id = _user_id AND role IN ('owner','admin') AND status = 'active'
  );
$$;

-- ─── RLS POLICIES ─────────────────────────────────────────────

ALTER TABLE groups         ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls          ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_invites  ENABLE ROW LEVEL SECURITY;

-- groups policies
DROP POLICY IF EXISTS "groups_select" ON groups;
DROP POLICY IF EXISTS "groups_insert" ON groups;
DROP POLICY IF EXISTS "groups_update" ON groups;
DROP POLICY IF EXISTS "groups_delete" ON groups;

CREATE POLICY "groups_select" ON groups FOR SELECT TO authenticated
  USING (is_public = true OR owner_id = auth.uid() OR public.is_group_member(id, auth.uid()));

CREATE POLICY "groups_insert" ON groups FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "groups_update" ON groups FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.is_group_admin(id, auth.uid()));

CREATE POLICY "groups_delete" ON groups FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

-- group_members policies (No subqueries against group_members directly!)
DROP POLICY IF EXISTS "gm_select" ON group_members;
DROP POLICY IF EXISTS "gm_insert" ON group_members;
DROP POLICY IF EXISTS "gm_update" ON group_members;
DROP POLICY IF EXISTS "gm_delete" ON group_members;

CREATE POLICY "gm_select" ON group_members FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    public.is_group_member(group_id, auth.uid()) OR
    EXISTS (SELECT 1 FROM groups g WHERE g.id = group_id AND g.is_public = true)
  );

CREATE POLICY "gm_insert" ON group_members FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR
    public.is_group_admin(group_id, auth.uid())
  );

CREATE POLICY "gm_update" ON group_members FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid() OR
    public.is_group_admin(group_id, auth.uid())
  );

CREATE POLICY "gm_delete" ON group_members FOR DELETE TO authenticated
  USING (
    user_id = auth.uid() OR
    public.is_group_admin(group_id, auth.uid())
  );

-- group_messages policies
DROP POLICY IF EXISTS "gmsg_select" ON group_messages;
DROP POLICY IF EXISTS "gmsg_insert" ON group_messages;
DROP POLICY IF EXISTS "gmsg_update" ON group_messages;

CREATE POLICY "gmsg_select" ON group_messages FOR SELECT TO authenticated
  USING (public.is_group_member(group_id, auth.uid()));

CREATE POLICY "gmsg_insert" ON group_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND public.is_group_member(group_id, auth.uid()));

CREATE POLICY "gmsg_update" ON group_messages FOR UPDATE TO authenticated
  USING (sender_id = auth.uid() OR public.is_group_admin(group_id, auth.uid()));

-- calls policies
DROP POLICY IF EXISTS "calls_select" ON calls;
DROP POLICY IF EXISTS "calls_insert" ON calls;
DROP POLICY IF EXISTS "calls_update" ON calls;

CREATE POLICY "calls_select" ON calls FOR SELECT TO authenticated
  USING (caller_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "calls_insert" ON calls FOR INSERT TO authenticated
  WITH CHECK (caller_id = auth.uid());

CREATE POLICY "calls_update" ON calls FOR UPDATE TO authenticated
  USING (caller_id = auth.uid() OR receiver_id = auth.uid());

-- group_invites policies
DROP POLICY IF EXISTS "invites_select" ON group_invites;
DROP POLICY IF EXISTS "invites_insert" ON group_invites;

CREATE POLICY "invites_select" ON group_invites FOR SELECT TO authenticated USING (true);
CREATE POLICY "invites_insert" ON group_invites FOR INSERT TO authenticated
  WITH CHECK (public.is_group_admin(group_id, auth.uid()));

-- ─── REALTIME ─────────────────────────────────────────────────

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE group_messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE group_members;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE calls;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
