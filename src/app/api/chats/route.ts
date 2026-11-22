import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';



export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 1. Fetch user's active chats
    const { data: chats, error: chatsError } = await supabase
      .from('chats')
      .select('*')
      .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
      .eq('is_active', true)
      .order('updated_at', { ascending: false });

    if (chatsError) {
      console.error('Fetch chats error:', chatsError);
      return NextResponse.json({ error: 'Failed to fetch chats' }, { status: 500 });
    }

    // 2. Fetch blocked users to exclude chats if blocked
    const { data: blocks } = await supabase
      .from('blocks')
      .select('blocker_id, blocked_id')
      .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`);

    const blockedSet = new Set<string>();
    blocks?.forEach((b) => {
      if (b.blocker_id === user.id) blockedSet.add(b.blocked_id);
      if (b.blocked_id === user.id) blockedSet.add(b.blocker_id);
    });

    // 3. For each chat, fetch other participant's profile and the last message
    const results = await Promise.all(
      (chats || []).map(async (chat) => {
        const otherUserId = chat.participant_1 === user.id ? chat.participant_2 : chat.participant_1;
        if (blockedSet.has(otherUserId)) return null;

        const isP1 = chat.participant_1 === user.id;
        const clearedAt = isP1 ? chat.cleared_at_p1 : chat.cleared_at_p2;

        // Fetch other user profile
        const { data: profile } = await supabase
          .from('public_profiles')
          .select('id, display_name, avatar_url, is_online, last_seen_at')
          .eq('id', otherUserId)
          .single();

        // Fetch last message (after clearedAt if cleared)
        let msgQuery = supabase
          .from('messages')
          .select('*')
          .eq('chat_id', chat.id)
          .eq('is_deleted', false);

        if (clearedAt) {
          msgQuery = msgQuery.gt('created_at', clearedAt);
        }

        const { data: lastMsgs } = await msgQuery
          .order('created_at', { ascending: false })
          .limit(1);

        const lastMessage = lastMsgs?.[0] || null;

        // Count unread messages (sent by other user, read_at is null, after clearedAt)
        let unreadQuery = supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('chat_id', chat.id)
          .eq('sender_id', otherUserId)
          .is('read_at', null)
          .eq('is_deleted', false);

        if (clearedAt) {
          unreadQuery = unreadQuery.gt('created_at', clearedAt);
        }

        const { count: unreadCount } = await unreadQuery;

        return {
          id: chat.id,
          otherUser: profile,
          lastMessage,
          unreadCount: unreadCount || 0,
          updated_at: chat.updated_at,
        };
      })
    );

    const validChats = results.filter(Boolean);

    return NextResponse.json({ chats: validChats });
  } catch (err) {
    console.error('Chats GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
