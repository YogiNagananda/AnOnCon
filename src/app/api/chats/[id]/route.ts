import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { filterMessageContent } from '@/lib/safety/messageFilter';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: chatId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 1. Verify user is in chat and chat is active
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .select('*')
      .eq('id', chatId)
      .eq('is_active', true)
      .single();

    if (chatError || !chat) {
      return NextResponse.json({ error: 'Chat not found or inactive' }, { status: 404 });
    }

    if (chat.participant_1 !== user.id && chat.participant_2 !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const otherUserId = chat.participant_1 === user.id ? chat.participant_2 : chat.participant_1;

    // 2. Check blocks
    const { data: blocks } = await supabase
      .from('blocks')
      .select('id')
      .or(`and(blocker_id.eq.${user.id},blocked_id.eq.${otherUserId}),and(blocker_id.eq.${otherUserId},blocked_id.eq.${user.id})`)
      .limit(1);

    if (blocks && blocks.length > 0) {
      return NextResponse.json({ error: 'This conversation has been closed' }, { status: 403 });
    }

    // 3. Fetch other user profile
    const { data: otherUser } = await supabase
      .from('public_profiles')
      .select('*')
      .eq('id', otherUserId)
      .single();

    // 4. Fetch messages (filtering out cleared_at and user's deleted_by_users)
    const isP1 = chat.participant_1 === user.id;
    const clearedAt = isP1 ? chat.cleared_at_p1 : chat.cleared_at_p2;

    let msgQuery = supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (clearedAt) {
      msgQuery = msgQuery.gt('created_at', clearedAt);
    }

    const { data: messages, error: msgError } = await msgQuery;

    if (msgError) {
      return NextResponse.json({ error: 'Failed to load messages' }, { status: 500 });
    }

    // Filter out messages deleted specifically by this user
    const filteredMessages = (messages || []).filter(
      (m) => !(m.deleted_by_users && m.deleted_by_users.includes(user.id))
    );

    // 5. Mark other user's unread messages as read
    const unreadMessageIds = filteredMessages
      .filter((m) => m.sender_id === otherUserId && !m.read_at)
      .map((m) => m.id);

    if (unreadMessageIds.length > 0) {
      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .in('id', unreadMessageIds);
    }

    return NextResponse.json({
      chat,
      otherUser,
      messages: filteredMessages,
    });
  } catch (err) {
    console.error('Chat details error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: chatId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { content } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Message content cannot be empty' }, { status: 400 });
    }

    // Verify chat
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .select('*')
      .eq('id', chatId)
      .eq('is_active', true)
      .single();

    if (chatError || !chat) {
      return NextResponse.json({ error: 'Chat not found or inactive' }, { status: 404 });
    }

    if (chat.participant_1 !== user.id && chat.participant_2 !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const otherUserId = chat.participant_1 === user.id ? chat.participant_2 : chat.participant_1;

    // Check block
    const { data: blocks } = await supabase
      .from('blocks')
      .select('id')
      .or(`and(blocker_id.eq.${user.id},blocked_id.eq.${otherUserId}),and(blocker_id.eq.${otherUserId},blocked_id.eq.${user.id})`)
      .limit(1);

    if (blocks && blocks.length > 0) {
      return NextResponse.json({ error: 'Cannot send message to this user' }, { status: 403 });
    }

    // Automated server-side content filter (bad words & 24h link/phone/email block)
    const filterCheck = filterMessageContent(content, chat.created_at);
    if (!filterCheck.allowed) {
      return NextResponse.json({
        error: filterCheck.friendlyMessage,
        code: 'CONTENT_FILTERED',
        reason: filterCheck.reason,
      }, { status: 422 });
    }

    // Insert message
    const { data: message, error: insertError } = await supabase
      .from('messages')
      .insert({
        chat_id: chatId,
        sender_id: user.id,
        content: content.trim(),
        delivered_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert message error:', insertError);
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }

    // Update chat updated_at
    await supabase.from('chats').update({ updated_at: new Date().toISOString() }).eq('id', chatId);

    return NextResponse.json({ success: true, message }, { status: 201 });
  } catch (err) {
    console.error('Send message error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
