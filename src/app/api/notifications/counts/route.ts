import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';



export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 1. Pending incoming connection requests
    const { count: pendingRequests } = await supabase
      .from('connection_requests')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', user.id)
      .eq('status', 'pending');

    // 2. Unread messages across all active user chats
    const { data: userChats } = await supabase
      .from('chats')
      .select('id, participant_1, participant_2, cleared_at_p1, cleared_at_p2')
      .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
      .eq('is_active', true);

    let unreadMessagesTotal = 0;

    if (userChats && userChats.length > 0) {
      const counts = await Promise.all(
        userChats.map(async (chat) => {
          const otherId = chat.participant_1 === user.id ? chat.participant_2 : chat.participant_1;
          const isP1 = chat.participant_1 === user.id;
          const clearedAt = isP1 ? chat.cleared_at_p1 : chat.cleared_at_p2;

          let q = supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('chat_id', chat.id)
            .eq('sender_id', otherId)
            .is('read_at', null)
            .eq('is_deleted', false);

          if (clearedAt) {
            q = q.gt('created_at', clearedAt);
          }

          const { count } = await q;
          return count || 0;
        })
      );

      unreadMessagesTotal = counts.reduce((acc, c) => acc + c, 0);
    }

    return NextResponse.json({
      pendingRequests: pendingRequests || 0,
      unreadMessages: unreadMessagesTotal,
    });
  } catch (err) {
    console.error('Notifications count error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
