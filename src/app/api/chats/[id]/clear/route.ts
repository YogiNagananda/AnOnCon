import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: chatId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: chat, error } = await supabase
      .from('chats')
      .select('participant_1, participant_2')
      .eq('id', chatId)
      .single();

    if (error || !chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    if (chat.participant_1 !== user.id && chat.participant_2 !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const isP1 = chat.participant_1 === user.id;
    const updatePayload = isP1
      ? { cleared_at_p1: new Date().toISOString() }
      : { cleared_at_p2: new Date().toISOString() };

    const { error: updateError } = await supabase
      .from('chats')
      .update(updatePayload)
      .eq('id', chatId);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to clear chat' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Chat cleared for you' });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
