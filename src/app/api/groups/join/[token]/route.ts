import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type Params = { params: Promise<{ token: string }> };

// POST /api/groups/join/:token — join via invite link
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const { token } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: invite } = await supabase
      .from('group_invites')
      .select('*')
      .eq('token', token)
      .single();

    if (!invite) return NextResponse.json({ error: 'Invalid invite link' }, { status: 404 });
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Invite link has expired' }, { status: 400 });
    }
    if (invite.max_uses && invite.use_count >= invite.max_uses) {
      return NextResponse.json({ error: 'Invite link has reached maximum uses' }, { status: 400 });
    }

    const groupId = invite.group_id;

    const { data: group } = await supabase.from('groups').select('max_members').eq('id', groupId).single();
    if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 });

    const { count } = await supabase
      .from('group_members')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', groupId)
      .eq('status', 'active');

    if ((count ?? 0) >= group.max_members) {
      return NextResponse.json({ error: 'Group is full' }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from('group_members')
      .select('status')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single();

    if (existing?.status === 'banned') return NextResponse.json({ error: 'You are banned from this group' }, { status: 403 });
    if (existing?.status === 'active') return NextResponse.json({ error: 'Already a member' }, { status: 400 });

    if (existing) {
      await supabase.from('group_members').update({ status: 'active' }).eq('group_id', groupId).eq('user_id', user.id);
    } else {
      await supabase.from('group_members').insert({ group_id: groupId, user_id: user.id, role: 'member', status: 'active' });
    }

    // Increment use_count
    await supabase.from('group_invites').update({ use_count: invite.use_count + 1 }).eq('id', invite.id);

    return NextResponse.json({ success: true, group_id: groupId });
  } catch (err) {
    console.error('POST /api/groups/join/:token error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
