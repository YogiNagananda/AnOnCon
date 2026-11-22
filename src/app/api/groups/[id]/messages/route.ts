import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type Params = { params: Promise<{ id: string }> };

// GET /api/groups/:id/messages?before=<cursor>
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id: groupId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Check active membership
    const { data: mem } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!mem) return NextResponse.json({ error: 'Not a member' }, { status: 403 });

    const before = request.nextUrl.searchParams.get('before');
    let query = supabase
      .from('group_messages')
      .select('id, group_id, sender_id, content, is_deleted, created_at')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (before) query = query.lt('created_at', before);

    const { data: messages, error } = await query;
    if (error) throw error;

    // Fetch sender profiles
    const senderIds = [...new Set((messages ?? []).map((m: { sender_id: string }) => m.sender_id))];
    const { data: profiles } = await supabase
      .from('public_profiles')
      .select('id, display_name, avatar_url')
      .in('id', senderIds);

    const profileMap = new Map((profiles ?? []).map((p: { id: string }) => [p.id, p]));
    const enriched = (messages ?? []).reverse().map((m: { sender_id: string; [key: string]: unknown }) => ({
      ...m,
      sender: profileMap.get(m.sender_id) ?? null,
    }));

    return NextResponse.json({ messages: enriched });
  } catch (err) {
    console.error('GET /api/groups/:id/messages error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/groups/:id/messages — send a message
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id: groupId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { content } = await request.json();
    if (!content?.trim()) return NextResponse.json({ error: 'Content required' }, { status: 400 });
    if (content.length > 2000) return NextResponse.json({ error: 'Message too long (max 2000 chars)' }, { status: 400 });

    // RLS enforces mute/active membership check
    const { data: msg, error } = await supabase
      .from('group_messages')
      .insert({ group_id: groupId, sender_id: user.id, content: content.trim() })
      .select()
      .single();

    if (error) {
      if (error.code === '42501') return NextResponse.json({ error: 'You are muted or not an active member' }, { status: 403 });
      throw error;
    }

    return NextResponse.json({ message: msg }, { status: 201 });
  } catch (err) {
    console.error('POST /api/groups/:id/messages error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
