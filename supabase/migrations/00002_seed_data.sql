-- ============================================================================
-- Anon Connect - Seed Data
-- Migration: 00002_seed_data.sql
-- Description: Creates the predefined_interests table, seeds interest tags,
--              and inserts a test admin user profile.
-- ============================================================================

-- -------------------------
-- predefined_interests
-- -------------------------
-- COMMENT: Canonical list of interest tags that the app offers to users.
-- The profiles.interests column stores text[] values drawn from this list.
create table if not exists public.predefined_interests (
  id         uuid default gen_random_uuid() primary key,
  name       text unique not null,
  created_at timestamptz default now()
);

-- Enable RLS (consistent with the rest of the schema)
alter table public.predefined_interests enable row level security;

-- Everyone authenticated can read the predefined list.
create policy "predefined_interests_select"
  on public.predefined_interests for select
  to authenticated
  using (true);

-- Only admins can manage interests.
create policy "predefined_interests_insert"
  on public.predefined_interests for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- -------------------------
-- Seed interests
-- -------------------------
insert into public.predefined_interests (name) values
  ('Music'),
  ('Gaming'),
  ('Sports'),
  ('Movies'),
  ('Travel'),
  ('Food'),
  ('Tech'),
  ('Art'),
  ('Books'),
  ('Photography'),
  ('Fitness'),
  ('Fashion'),
  ('Science'),
  ('Nature'),
  ('Cooking'),
  ('Dance'),
  ('Anime'),
  ('Comedy'),
  ('Pets'),
  ('Writing')
on conflict (name) do nothing;

-- -------------------------
-- Test admin profile
-- -------------------------
-- COMMENT: Placeholder UUID for a test admin. In a real setup this would
-- correspond to an actual auth.users entry. Use this for local dev & testing.
-- The auth.users row must exist first; in Supabase local dev you can create
-- it via the dashboard or supabase auth admin create-user.
--
-- We wrap this in a DO block so it doesn't fail if auth.users doesn't have
-- this UUID yet (e.g., running migrations before seeding auth).
do $$
begin
  -- Only insert if not already present
  if not exists (select 1 from public.profiles where id = '00000000-0000-0000-0000-000000000001') then
    -- Attempt to insert; will fail silently if FK to auth.users is missing
    begin
      insert into public.profiles (
        id,
        display_name,
        dob,
        gender,
        bio,
        interests,
        languages,
        area,
        is_visible,
        role
      ) values (
        '00000000-0000-0000-0000-000000000001',
        'AnonAdmin',
        '1990-01-01',
        'prefer-not-to-say',
        'System administrator for Anon Connect.',
        array['Tech', 'Science'],
        array['en'],
        '{"country": "US", "state": "CA", "city": "San Francisco"}'::jsonb,
        false,
        'admin'
      );
      raise notice 'Test admin profile inserted.';
    exception when foreign_key_violation then
      raise notice 'Skipping admin seed: auth.users entry not found for placeholder UUID. Create the auth user first.';
    end;
  end if;
end;
$$;

-- ============================================================================
-- END OF MIGRATION 00002
-- ============================================================================
