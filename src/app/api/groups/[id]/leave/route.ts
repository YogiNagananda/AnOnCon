import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type Params = { params: Promise<{ id: string }> };

// POST /api/groups/:id/leave
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const { id: groupId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: mem } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single();

    if (!mem) return NextResponse.json({ error: 'Not a member' }, { status: 400 });
    if (mem.role === 'owner') {
      return NextResponse.json({ error: 'Owner cannot leave — delete the group or transfer ownership first' }, { status: 400 });
    }

    await supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', user.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('POST /api/groups/:id/leave error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
