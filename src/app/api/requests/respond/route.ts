import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { request_id, action } = body; // action: 'accept' | 'reject'

    if (!request_id || !action || !['accept', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Valid request_id and action (accept/reject) required' }, { status: 400 });
    }

    // 1. Fetch request
    const { data: connRequest, error: fetchError } = await supabase
      .from('connection_requests')
      .select('*')
      .eq('id', request_id)
      .single();

    if (fetchError || !connRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    if (connRequest.receiver_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized to respond to this request' }, { status: 403 });
    }

    if (connRequest.status !== 'pending') {
      return NextResponse.json({ error: `Request already ${connRequest.status}` }, { status: 400 });
    }

    if (action === 'reject') {
      const { error: updateError } = await supabase
        .from('connection_requests')
        .update({
          status: 'rejected',
          responded_at: new Date().toISOString(),
        })
        .eq('id', request_id);

      if (updateError) {
        return NextResponse.json({ error: 'Failed to reject request' }, { status: 500 });
      }

      return NextResponse.json({ success: true, status: 'rejected' });
    }

    // Action: Accept -> Create 1:1 chat
    const { error: acceptError } = await supabase
      .from('connection_requests')
      .update({
        status: 'accepted',
        responded_at: new Date().toISOString(),
      })
      .eq('id', request_id);

    if (acceptError) {
      return NextResponse.json({ error: 'Failed to accept request' }, { status: 500 });
    }

    // Order participants deterministically
    const p1 = connRequest.sender_id < user.id ? connRequest.sender_id : user.id;
    const p2 = connRequest.sender_id < user.id ? user.id : connRequest.sender_id;

    // Check if chat already exists
    const { data: existingChat } = await supabase
      .from('chats')
      .select('id')
      .eq('participant_1', p1)
      .eq('participant_2', p2)
      .maybeSingle();

    let chatId = existingChat?.id;

    if (!chatId) {
      const { data: newChat, error: chatError } = await supabase
        .from('chats')
        .insert({
          participant_1: p1,
          participant_2: p2,
          connection_request_id: connRequest.id,
          is_active: true,
        })
        .select()
        .single();

      if (chatError) {
        console.error('Chat creation error:', chatError);
        return NextResponse.json({ error: 'Failed to create chat' }, { status: 500 });
      }
      chatId = newChat.id;
    } else {
      await supabase
        .from('chats')
        .update({ is_active: true, connection_request_id: connRequest.id })
        .eq('id', chatId);
    }

    return NextResponse.json({ success: true, status: 'accepted', chat_id: chatId });
  } catch (err) {
    console.error('Respond request error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
