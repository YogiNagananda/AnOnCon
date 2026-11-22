import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/types';

type GroupMemberUpdate = Database['public']['Tables']['group_members']['Update'];

type Params = { params: Promise<{ id: string }> };

// GET /api/groups/:id/members
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id: groupId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: members, error } = await supabase
      .from('group_members')
      .select('id, group_id, user_id, role, status, is_muted, created_at')
      .eq('group_id', groupId)
      .order('role', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Fetch public profiles for each member
    const userIds = (members ?? []).map((m: { user_id: string }) => m.user_id);
    const { data: profiles } = await supabase
      .from('public_profiles')
      .select('id, display_name, avatar_url, is_online')
      .in('id', userIds);

    const profileMap = new Map((profiles ?? []).map((p: { id: string; display_name: string; avatar_url: string | null; is_online: boolean }) => [p.id, p]));
    const enriched = (members ?? []).map((m: { user_id: string; [key: string]: unknown }) => ({
      ...m,
      profile: profileMap.get(m.user_id) ?? null,
    }));

    return NextResponse.json({ members: enriched });
  } catch (err) {
    console.error('GET /api/groups/:id/members error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/groups/:id/members — moderate: mute, ban, remove, promote, demote
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id: groupId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { target_user_id, action } = body;
    // action: 'mute' | 'unmute' | 'ban' | 'remove' | 'promote' | 'demote' | 'approve'

    if (!target_user_id || !action) {
      return NextResponse.json({ error: 'target_user_id and action are required' }, { status: 400 });
    }

    // Requester's membership
    const { data: myMem } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!myMem || !['owner', 'admin'].includes(myMem.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Target's membership
    const { data: targetMem } = await supabase
      .from('group_members')
      .select('role, status')
      .eq('group_id', groupId)
      .eq('user_id', target_user_id)
      .single();

    if (!targetMem) return NextResponse.json({ error: 'Target user not in group' }, { status: 404 });

    // Admins cannot act on owner
    if (targetMem.role === 'owner') {
      return NextResponse.json({ error: 'Cannot moderate the owner' }, { status: 403 });
    }
    // Admins cannot act on other admins unless they are owner
    if (targetMem.role === 'admin' && myMem.role !== 'owner') {
      return NextResponse.json({ error: 'Only the owner can moderate admins' }, { status: 403 });
    }

    let update: GroupMemberUpdate = {};
    if (action === 'mute')   update = { is_muted: true };
    else if (action === 'unmute') update = { is_muted: false };
    else if (action === 'ban')    update = { status: 'banned' };
    else if (action === 'remove') {
      await supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', target_user_id);
      return NextResponse.json({ success: true });
    } else if (action === 'promote' && myMem.role === 'owner') update = { role: 'admin' };
    else if (action === 'demote'  && myMem.role === 'owner') update = { role: 'member' };
    else if (action === 'approve') update = { status: 'active' };
    else return NextResponse.json({ error: 'Unknown action' }, { status: 400 });

    await supabase.from('group_members').update(update).eq('group_id', groupId).eq('user_id', target_user_id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('PATCH /api/groups/:id/members error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
