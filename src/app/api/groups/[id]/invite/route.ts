import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

type Params = { params: Promise<{ id: string }> };

// POST /api/groups/:id/invite — generate invite link (admin/owner only)
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const { id: groupId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const adminSupabase = await createAdminClient();

    const { data: mem } = await adminSupabase
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!mem || !['owner', 'admin'].includes(mem.role)) {
      return NextResponse.json({ error: 'Only admins can generate invite links' }, { status: 403 });
    }

    const { data: invite, error } = await adminSupabase
      .from('group_invites')
      .insert({ group_id: groupId, created_by: user.id })
      .select()
      .single();

    if (error) throw error;

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    return NextResponse.json({ invite_url: `${baseUrl}/groups/join/${invite.token}` });
  } catch (err) {
    console.error('POST /api/groups/:id/invite error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
