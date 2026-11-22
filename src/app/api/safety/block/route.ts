import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { target_user_id, reason } = body;

    if (!target_user_id) {
      return NextResponse.json({ error: 'Target user ID is required' }, { status: 400 });
    }
    if (target_user_id === user.id) {
      return NextResponse.json({ error: 'Cannot block yourself' }, { status: 400 });
    }

    // 1. Insert block record
    const { error: blockError } = await supabase
      .from('blocks')
      .upsert({
        blocker_id: user.id,
        blocked_id: target_user_id,
      }, { onConflict: 'blocker_id,blocked_id' });

    if (blockError) {
      console.error('Block error:', blockError);
      return NextResponse.json({ error: 'Failed to block user' }, { status: 500 });
    }

    // 2. Deactivate any mutual chats immediately
    await supabase
      .from('chats')
      .update({ is_active: false })
      .or(`and(participant_1.eq.${user.id},participant_2.eq.${target_user_id}),and(participant_1.eq.${target_user_id},participant_2.eq.${user.id})`);

    // 3. Immediately end any active or ringing calls between the two users
    await supabase
      .from('calls')
      .update({ status: 'ended', ended_at: new Date().toISOString() })
      .in('status', ['ringing', 'active'])
      .or(`and(caller_id.eq.${user.id},receiver_id.eq.${target_user_id}),and(caller_id.eq.${target_user_id},receiver_id.eq.${user.id})`);

    // 4. Mark any pending connection requests as rejected
    await supabase
      .from('connection_requests')
      .update({ status: 'rejected', responded_at: new Date().toISOString() })
      .eq('status', 'pending')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${target_user_id}),and(sender_id.eq.${target_user_id},receiver_id.eq.${user.id})`);

    return NextResponse.json({ success: true, message: 'User blocked and hidden' });
  } catch (err) {
    console.error('Block handler error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
