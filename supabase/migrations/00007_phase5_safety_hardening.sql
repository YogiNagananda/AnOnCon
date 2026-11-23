-- ============================================================================
-- Migration 00007: Phase 5 - Safety, Admin Dashboard and Security Hardening
-- ============================================================================

-- 1. Helper function: is_admin (SECURITY DEFINER to prevent recursive RLS)
create or replace function public.is_admin(p_user_id uuid default auth.uid())
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = p_user_id and role = 'admin'
  );
$$;

-- 2. Procedure to promote user to admin easily via email (for initial setup)
create or replace function public.promote_to_admin(target_email text)
returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid;
begin
  select id into v_user_id from auth.users where email = target_email limit 1;
  if v_user_id is null then
    return 'User not found with email: ' || target_email;
  end if;

  update public.profiles set role = 'admin' where id = v_user_id;
  return 'User ' || target_email || ' successfully promoted to admin.';
end;
$$;

-- 3. Update reports table:
-- Drop old check constraint on reason if present to allow new reasons
do $$
begin
  alter table public.reports drop constraint if exists reports_reason_check;
exception
  when undefined_object then null;
end $$;

alter table public.reports
  add constraint reports_reason_check
  check (reason in ('harassment', 'sexual content', 'scam/spam', 'appears under 18', 'underage', 'inappropriate', 'spam', 'other'));

-- Add report_type, target_message_id, target_group_id if not present
alter table public.reports
  add column if not exists report_type text default 'user' check (report_type in ('user', 'message', 'group')),
  add column if not exists target_message_id uuid references public.messages(id) on delete set null,
  add column if not exists target_group_id uuid references public.groups(id) on delete set null,
  add column if not exists admin_notes text,
  add column if not exists resolved_by uuid references public.profiles(id) on delete set null,
  add column if not exists resolved_at timestamptz;

-- 4. Auto-escalate Underage / Appears Under 18 reports trigger:
-- Priority becomes urgent, and the reported user is automatically suspended pending admin review.
create or replace function public.auto_escalate_underage_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.reason in ('underage', 'appears under 18') then
    new.priority := 'urgent';
    -- Auto-suspend reported user for 30 days pending admin review
    update public.profiles
    set is_suspended = true,
        suspended_until = now() + interval '30 days'
    where id = new.reported_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_auto_escalate_underage on public.reports;
create trigger trg_auto_escalate_underage
  before insert or update on public.reports
  for each row
  execute function public.auto_escalate_underage_report();

-- 5. Banned Identifiers table (IP and device fingerprint hashes)
create table if not exists public.banned_identifiers (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references public.profiles(id) on delete set null,
  ip_hash     text,
  device_hash text,
  reason      text,
  banned_by   uuid references public.profiles(id) on delete set null,
  created_at  timestamptz default now()
);

create index if not exists idx_banned_identifiers_ip on public.banned_identifiers(ip_hash);
create index if not exists idx_banned_identifiers_device on public.banned_identifiers(device_hash);

-- Enable RLS on banned_identifiers
alter table public.banned_identifiers enable row level security;

-- Admin-only RLS for banned_identifiers
drop policy if exists "banned_identifiers_admin_select" on public.banned_identifiers;
create policy "banned_identifiers_admin_select"
  on public.banned_identifiers for select
  to authenticated
  using (public.is_admin(auth.uid()));

drop policy if exists "banned_identifiers_admin_insert" on public.banned_identifiers;
create policy "banned_identifiers_admin_insert"
  on public.banned_identifiers for insert
  to authenticated
  with check (public.is_admin(auth.uid()));

drop policy if exists "banned_identifiers_admin_delete" on public.banned_identifiers;
create policy "banned_identifiers_admin_delete"
  on public.banned_identifiers for delete
  to authenticated
  using (public.is_admin(auth.uid()));

-- 6. Rate limits storage table (for persistent server-side rate limits)
create table if not exists public.rate_limits (
  id          uuid default gen_random_uuid() primary key,
  key         text not null,
  created_at  timestamptz default now()
);

create index if not exists idx_rate_limits_key_time on public.rate_limits(key, created_at desc);

alter table public.rate_limits enable row level security;

-- Service role will manage rate limits; deny public reads
drop policy if exists "rate_limits_deny_public" on public.rate_limits;
create policy "rate_limits_deny_public"
  on public.rate_limits for all
  to authenticated
  using (false);

-- Function to prune expired rate limit rows (older than 24 hours)
create or replace function public.cleanup_rate_limits()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.rate_limits where created_at < now() - interval '24 hours';
$$;

-- 7. Ensure RLS on reports and moderation_actions uses non-recursive is_admin()
drop policy if exists "reports_select" on public.reports;
create policy "reports_select"
  on public.reports for select
  to authenticated
  using (
    reporter_id = auth.uid()
    or public.is_admin(auth.uid())
  );

drop policy if exists "reports_update" on public.reports;
create policy "reports_update"
  on public.reports for update
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop policy if exists "moderation_actions_select" on public.moderation_actions;
create policy "moderation_actions_select"
  on public.moderation_actions for select
  to authenticated
  using (public.is_admin(auth.uid()));

drop policy if exists "moderation_actions_insert" on public.moderation_actions;
create policy "moderation_actions_insert"
  on public.moderation_actions for insert
  to authenticated
  with check (public.is_admin(auth.uid()));
