import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/security/rateLimit';

const ALLOWED_EMOJIS = new Set(['👍', '❤️', '😂', '😮', '😢', '🔥', '👏', '🎉']);

async function verifyMessageAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  messageId: string,
  userId: string
) {
  const { data: message, error: msgError } = await supabase
    .from('messages')
    .select('id, chat_id, is_deleted')
    .eq('id', messageId)
    .single();

  if (msgError || !message) {
    return { error: 'Message not found', status: 404 as const };
  }

  const { data: chat, error: chatError } = await supabase
    .from('chats')
    .select('id, participant_1, participant_2, is_active')
    .eq('id', message.chat_id)
    .single();

  if (chatError || !chat || !chat.is_active) {
    return { error: 'Chat not found or inactive', status: 404 as const };
  }

  if (chat.participant_1 !== userId && chat.participant_2 !== userId) {
    return { error: 'Forbidden', status: 403 as const };
  }

  const otherUserId = chat.participant_1 === userId ? chat.participant_2 : chat.participant_1;
  const { data: blocks } = await supabase
    .from('blocks')
    .select('id')
    .or(`and(blocker_id.eq.${userId},blocked_id.eq.${otherUserId}),and(blocker_id.eq.${otherUserId},blocked_id.eq.${userId})`)
    .limit(1);

  if (blocks && blocks.length > 0) {
    return { error: 'This conversation has been closed', status: 403 as const };
  }

  return { message, chat };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: messageId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const access = await verifyMessageAccess(supabase, messageId, user.id);
    if ('error' in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const { data: reactions, error } = await supabase
      .from('message_reactions')
      .select('id, message_id, user_id, emoji, created_at')
      .eq('message_id', messageId)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: 'Failed to load reactions' }, { status: 500 });
    }

    return NextResponse.json({ reactions: reactions || [] });
  } catch (err) {
    console.error('GET /api/messages/[id]/reactions error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: messageId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const limitCheck = checkRateLimit(user.id, 'reactions');
    if (!limitCheck.success) {
      return NextResponse.json(
        { error: `Too many reactions. Please wait ${limitCheck.resetSeconds}s.` },
        { status: 429, headers: { 'Retry-After': String(limitCheck.resetSeconds) } }
      );
    }

    const body = await request.json();
    const emoji = typeof body?.emoji === 'string' ? body.emoji.trim() : '';

    if (!emoji || !ALLOWED_EMOJIS.has(emoji)) {
      return NextResponse.json({ error: 'Invalid reaction emoji' }, { status: 400 });
    }

    const access = await verifyMessageAccess(supabase, messageId, user.id);
    if ('error' in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    if (access.message.is_deleted) {
      return NextResponse.json({ error: 'Cannot react to a deleted message' }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from('message_reactions')
      .select('id')
      .eq('message_id', messageId)
      .eq('user_id', user.id)
      .eq('emoji', emoji)
      .maybeSingle();

    let action: 'added' | 'removed';

    if (existing) {
      const { error: deleteError } = await supabase
        .from('message_reactions')
        .delete()
        .eq('id', existing.id);

      if (deleteError) {
        return NextResponse.json({ error: 'Failed to remove reaction' }, { status: 500 });
      }
      action = 'removed';
    } else {
      const { error: insertError } = await supabase
        .from('message_reactions')
        .insert({
          message_id: messageId,
          user_id: user.id,
          emoji,
        });

      if (insertError) {
        return NextResponse.json({ error: 'Failed to add reaction' }, { status: 500 });
      }
      action = 'added';
    }

    const { data: reactions } = await supabase
      .from('message_reactions')
      .select('id, message_id, user_id, emoji, created_at')
      .eq('message_id', messageId)
      .order('created_at', { ascending: true });

    return NextResponse.json({
      success: true,
      action,
      reactions: reactions || [],
    });
  } catch (err) {
    console.error('POST /api/messages/[id]/reactions error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
