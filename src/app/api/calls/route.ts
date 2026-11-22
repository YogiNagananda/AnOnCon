import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/calls — initiate a call
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { chat_id, type } = await request.json();
    if (!chat_id) return NextResponse.json({ error: 'chat_id required' }, { status: 400 });

    const callType = type === 'video' ? 'video' : 'voice';

    // Verify chat exists and user is a participant
    const { data: chat } = await supabase
      .from('chats')
      .select('*')
      .eq('id', chat_id)
      .single();

    if (!chat || !chat.is_active) {
      return NextResponse.json({ error: 'Chat not found or inactive' }, { status: 404 });
    }
    if (chat.participant_1 !== user.id && chat.participant_2 !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const receiverId = chat.participant_1 === user.id ? chat.participant_2 : chat.participant_1;

    // Check if either user has blocked the other
    const { data: block } = await supabase
      .from('blocks')
      .select('id')
      .or(`and(blocker_id.eq.${user.id},blocked_id.eq.${receiverId}),and(blocker_id.eq.${receiverId},blocked_id.eq.${user.id})`)
      .maybeSingle();

    if (block) return NextResponse.json({ error: 'Cannot call — user is blocked' }, { status: 403 });

    // Check for existing active call in this chat
    const { data: existingCall } = await supabase
      .from('calls')
      .select('id')
      .eq('chat_id', chat_id)
      .in('status', ['ringing', 'active'])
      .maybeSingle();

    if (existingCall) {
      return NextResponse.json({ error: 'A call is already in progress for this chat' }, { status: 400 });
    }

    const { data: call, error } = await supabase
      .from('calls')
      .insert({
        chat_id,
        caller_id: user.id,
        receiver_id: receiverId,
        type: callType,
        status: 'ringing',
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ call }, { status: 201 });
  } catch (err) {
    console.error('POST /api/calls error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
