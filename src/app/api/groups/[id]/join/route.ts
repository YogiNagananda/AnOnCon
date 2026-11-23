import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

type Params = { params: Promise<{ id: string }> };

// POST /api/groups/:id/join
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const { id: groupId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const adminSupabase = await createAdminClient();

    const { data: group } = await adminSupabase.from('groups').select('*').eq('id', groupId).single();
    if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 });

    // Check ban
    const { data: existing } = await adminSupabase
      .from('group_members')
      .select('status, role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single();

    if (existing?.status === 'banned') {
      return NextResponse.json({ error: 'You are banned from this group' }, { status: 403 });
    }
    if (existing?.status === 'active') {
      return NextResponse.json({ error: 'Already a member' }, { status: 400 });
    }

    // Check capacity
    const { count } = await adminSupabase
      .from('group_members')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', groupId)
      .eq('status', 'active');

    if ((count ?? 0) >= group.max_members) {
      return NextResponse.json({ error: 'Group is full (200 members max)' }, { status: 400 });
    }

    const status = group.is_public ? 'active' : 'pending';

    if (existing) {
      await adminSupabase.from('group_members').update({ status }).eq('group_id', groupId).eq('user_id', user.id);
    } else {
      await adminSupabase.from('group_members').insert({ group_id: groupId, user_id: user.id, role: 'member', status });
    }

    return NextResponse.json({ success: true, status });
  } catch (err) {
    console.error('POST /api/groups/:id/join error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
