import { NextRequest, NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { chat_id, call_id } = await request.json();
    if (!chat_id || !call_id) {
      return NextResponse.json({ error: 'chat_id and call_id required' }, { status: 400 });
    }

    // Verify chat is active (accepted)
    const { data: chat } = await supabase
      .from('chats')
      .select('id, is_active')
      .eq('id', chat_id)
      .single();

    if (!chat || !chat.is_active) {
      return NextResponse.json({ error: 'Chat is not active or accepted' }, { status: 403 });
    }

    // Verify call record exists and user is a participant
    const { data: call } = await supabase
      .from('calls')
      .select('*')
      .eq('id', call_id)
      .eq('chat_id', chat_id)
      .single();

    if (!call) return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    if (call.caller_id !== user.id && call.receiver_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!['ringing', 'active'].includes(call.status)) {
      return NextResponse.json({ error: 'Call is no longer active' }, { status: 400 });
    }

    // Check blocks
    const { data: block } = await supabase
      .from('blocks')
      .select('id')
      .or(`and(blocker_id.eq.${user.id},blocked_id.eq.${call.caller_id === user.id ? call.receiver_id : call.caller_id}),and(blocker_id.eq.${call.caller_id === user.id ? call.receiver_id : call.caller_id},blocked_id.eq.${user.id})`)
      .maybeSingle();

    if (block) return NextResponse.json({ error: 'Cannot join call — user is blocked' }, { status: 403 });

    const apiKey    = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      return NextResponse.json({ error: 'LiveKit not configured' }, { status: 503 });
    }

    const roomName = call.livekit_room_name ?? `call_${call_id}`;

    // Update room name if not set
    if (!call.livekit_room_name) {
      await supabase.from('calls').update({ livekit_room_name: roomName }).eq('id', call_id);
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity: user.id,
      ttl: '1h',
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();

    return NextResponse.json({
      token,
      room_name: roomName,
      livekit_url: process.env.LIVEKIT_URL,
    });
  } catch (err) {
    console.error('POST /api/calls/token error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
