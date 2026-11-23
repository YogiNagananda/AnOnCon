-- ============================================================================
-- Migration 00008: Fix Infinite Recursion in group_members and groups RLS Policies
-- ============================================================================

-- 1. Drop ALL duplicate and legacy policies on group_members
DROP POLICY IF EXISTS "group_members_select" ON public.group_members;
DROP POLICY IF EXISTS "group_members_insert" ON public.group_members;
DROP POLICY IF EXISTS "group_members_update" ON public.group_members;
DROP POLICY IF EXISTS "group_members_delete" ON public.group_members;

DROP POLICY IF EXISTS "gm_select" ON public.group_members;
DROP POLICY IF EXISTS "gm_insert" ON public.group_members;
DROP POLICY IF EXISTS "gm_update" ON public.group_members;
DROP POLICY IF EXISTS "gm_delete" ON public.group_members;

-- 2. Drop ALL duplicate and legacy policies on groups
DROP POLICY IF EXISTS "groups_select" ON public.groups;
DROP POLICY IF EXISTS "groups_insert" ON public.groups;
DROP POLICY IF EXISTS "groups_update" ON public.groups;
DROP POLICY IF EXISTS "groups_delete" ON public.groups;

-- 3. Create or replace SECURITY DEFINER helper functions to prevent recursion
-- Note: SECURITY DEFINER runs as the owner (bypassing RLS on the queried table)

CREATE OR REPLACE FUNCTION public.is_group_public(_group_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.groups
    WHERE id = _group_id AND is_public = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_group_member(_group_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
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
    SELECT 1 FROM public.group_members
    WHERE group_id = _group_id AND user_id = _user_id AND role IN ('owner','admin') AND status = 'active'
  );
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.is_group_public(uuid) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.is_group_member(uuid, uuid) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.is_group_admin(uuid, uuid) TO authenticated, anon, service_role;

-- 4. Re-create clean, NON-RECURSIVE policies for public.groups

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "groups_select" ON public.groups
  FOR SELECT TO authenticated
  USING (
    is_public = true
    OR owner_id = auth.uid()
    OR public.is_group_member(id, auth.uid())
  );

CREATE POLICY "groups_insert" ON public.groups
  FOR INSERT TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
  );

CREATE POLICY "groups_update" ON public.groups
  FOR UPDATE TO authenticated
  USING (
    owner_id = auth.uid()
    OR public.is_group_admin(id, auth.uid())
  );

CREATE POLICY "groups_delete" ON public.groups
  FOR DELETE TO authenticated
  USING (
    owner_id = auth.uid()
  );

-- 5. Re-create clean, NON-RECURSIVE policies for public.group_members

ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gm_select" ON public.group_members
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_group_public(group_id)
    OR public.is_group_member(group_id, auth.uid())
  );

CREATE POLICY "gm_insert" ON public.group_members
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR public.is_group_admin(group_id, auth.uid())
  );

CREATE POLICY "gm_update" ON public.group_members
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_group_admin(group_id, auth.uid())
  );

CREATE POLICY "gm_delete" ON public.group_members
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_group_admin(group_id, auth.uid())
  );
