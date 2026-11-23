import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

type Params = { params: Promise<{ id: string; msgId: string }> };

// DELETE /api/groups/:id/messages/:msgId — soft delete (sender or admin/owner)
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id: groupId, msgId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const adminSupabase = await createAdminClient();

    const { data: msg } = await adminSupabase
      .from('group_messages')
      .select('sender_id')
      .eq('id', msgId)
      .eq('group_id', groupId)
      .single();

    if (!msg) return NextResponse.json({ error: 'Message not found' }, { status: 404 });

    const isAuthor = msg.sender_id === user.id;
    if (!isAuthor) {
      const { data: mem } = await adminSupabase
        .from('group_members')
        .select('role')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();
      if (!mem || !['owner', 'admin'].includes(mem.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    await adminSupabase.from('group_messages').update({ is_deleted: true, content: '[deleted]' }).eq('id', msgId);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE group message error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
