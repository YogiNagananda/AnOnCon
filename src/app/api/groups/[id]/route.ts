import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/types';

type GroupUpdate = Database['public']['Tables']['groups']['Update'];

type Params = { params: Promise<{ id: string }> };

// GET /api/groups/:id
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: group, error } = await supabase
      .from('groups')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !group) return NextResponse.json({ error: 'Group not found' }, { status: 404 });

    // Check membership
    const { data: myMembership } = await supabase
      .from('group_members')
      .select('role, status, is_muted')
      .eq('group_id', id)
      .eq('user_id', user.id)
      .single();

    // Count active members
    const { count } = await supabase
      .from('group_members')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', id)
      .eq('status', 'active');

    return NextResponse.json({ group, membership: myMembership, member_count: count ?? 0 });
  } catch (err) {
    console.error('GET /api/groups/:id error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/groups/:id — update group info (owner/admin only)
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Check admin/owner
    const { data: mem } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!mem || !['owner', 'admin'].includes(mem.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const allowed: GroupUpdate = {};
    if (body.name !== undefined) allowed.name = body.name.trim();
    if (body.description !== undefined) allowed.description = body.description?.trim() ?? null;
    if (body.tags !== undefined) allowed.tags = Array.isArray(body.tags) ? body.tags.slice(0, 10) : [];
    if (mem.role === 'owner' && body.is_public !== undefined) allowed.is_public = body.is_public;
    if (body.icon_url !== undefined) allowed.icon_url = body.icon_url;

    const { data: updated, error } = await supabase
      .from('groups')
      .update(allowed)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ group: updated });
  } catch (err) {
    console.error('PATCH /api/groups/:id error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/groups/:id — owner only
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: group } = await supabase.from('groups').select('owner_id').eq('id', id).single();
    if (!group || group.owner_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden — only the owner can delete a group' }, { status: 403 });
    }

    const { error } = await supabase.from('groups').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/groups/:id error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
