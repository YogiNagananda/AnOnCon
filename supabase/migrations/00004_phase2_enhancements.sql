-- Migration: 00004_phase2_enhancements.sql
-- Description: Adds cleared_at to chats for "clear chat for me",
--              realtime publication adjustments, and helper RPCs.

-- Add cleared_at timestamps for participant_1 and participant_2
alter table public.chats
  add column if not exists cleared_at_p1 timestamptz default null,
  add column if not exists cleared_at_p2 timestamptz default null;

-- Add soft-delete flag and delete_for arrays to messages if needed
-- is_deleted is already boolean default false in migration 1.
-- Let's add deleted_by_users uuid[] for per-user deletion if user wants to delete for themselves
alter table public.messages
  add column if not exists deleted_by_users uuid[] default '{}';

-- Rate limit checking function for requests: max 20 requests per hour per user
create or replace function public.check_request_rate_limit(p_sender_id uuid)
returns boolean
language plpgsql
stable
security definer
as $$
declare
  v_count int;
begin
  select count(*)
  into v_count
  from public.connection_requests
  where sender_id = p_sender_id
    and created_at > now() - interval '1 hour';

  return v_count < 20;
end;
$$;

-- Function to accept a connection request and automatically create a 1:1 chat
create or replace function public.accept_connection_request(
  p_request_id uuid,
  p_user_id uuid
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_sender_id uuid;
  v_receiver_id uuid;
  v_status text;
  v_chat_id uuid;
  v_p1 uuid;
  v_p2 uuid;
begin
  -- Fetch the request
  select sender_id, receiver_id, status
  into v_sender_id, v_receiver_id, v_status
  from public.connection_requests
  where id = p_request_id;

  if not found then
    raise exception 'Request not found';
  end if;

  if v_receiver_id <> p_user_id then
    raise exception 'Unauthorized to accept this request';
  end if;

  if v_status <> 'pending' then
    raise exception 'Request is not pending (status: %)', v_status;
  end if;

  -- Update request status
  update public.connection_requests
  set status = 'accepted',
      responded_at = now(),
      updated_at = now()
  where id = p_request_id;

  -- Ensure participant order
  if v_sender_id < v_receiver_id then
    v_p1 := v_sender_id;
    v_p2 := v_receiver_id;
  else
    v_p1 := v_receiver_id;
    v_p2 := v_sender_id;
  end if;

  -- Create or find existing chat
  select id into v_chat_id
  from public.chats
  where (participant_1 = v_p1 and participant_2 = v_p2)
     or (participant_1 = v_p2 and participant_2 = v_p1);

  if v_chat_id is null then
    insert into public.chats (participant_1, participant_2, connection_request_id, is_active)
    values (v_p1, v_p2, p_request_id, true)
    returning id into v_chat_id;
  else
    update public.chats
    set is_active = true,
        connection_request_id = p_request_id,
        updated_at = now()
    where id = v_chat_id;
  end if;

  return v_chat_id;
end;
$$;

-- Function to block a user and deactivate active chat immediately
create or replace function public.block_user_and_close_chat(
  p_blocker_id uuid,
  p_blocked_id uuid,
  p_reason text default null
)
returns void
language plpgsql
security definer
as $$
begin
  -- Insert block
  insert into public.blocks (blocker_id, blocked_id, reason)
  values (p_blocker_id, p_blocked_id, p_reason)
  on conflict (blocker_id, blocked_id) do nothing;

  -- Deactivate chats between these two users
  update public.chats
  set is_active = false,
      updated_at = now()
  where (participant_1 = p_blocker_id and participant_2 = p_blocked_id)
     or (participant_1 = p_blocked_id and participant_2 = p_blocker_id);

  -- Reject or cancel any pending connection requests
  update public.connection_requests
  set status = 'rejected',
      responded_at = now(),
      updated_at = now()
  where status = 'pending'
    and ((sender_id = p_blocker_id and receiver_id = p_blocked_id)
      or (sender_id = p_blocked_id and receiver_id = p_blocker_id));
end;
$$;

-- Enable Realtime on tables for live updates
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'connection_requests'
  ) then
    alter publication supabase_realtime add table public.connection_requests;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chats'
  ) then
    alter publication supabase_realtime add table public.chats;
  end if;
end;
$$;
