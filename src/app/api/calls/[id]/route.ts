import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/types';

type CallUpdate = Database['public']['Tables']['calls']['Update'];

type Params = { params: Promise<{ id: string }> };

// PATCH /api/calls/:id — update call status (accept, decline, end, missed, toggle-video)
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id: callId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, video_enabled } = await request.json();
    // action: 'accept' | 'decline' | 'end' | 'missed' | 'toggle_video'

    const { data: call } = await supabase
      .from('calls')
      .select('*')
      .eq('id', callId)
      .single();

    if (!call) return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    if (call.caller_id !== user.id && call.receiver_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let update: CallUpdate = {};

    if (action === 'accept') {
      if (call.receiver_id !== user.id) return NextResponse.json({ error: 'Only receiver can accept' }, { status: 403 });
      if (call.status !== 'ringing') return NextResponse.json({ error: 'Call is not ringing' }, { status: 400 });
      update = { status: 'active', started_at: new Date().toISOString() };
    } else if (action === 'decline') {
      if (call.receiver_id !== user.id) return NextResponse.json({ error: 'Only receiver can decline' }, { status: 403 });
      update = { status: 'declined', ended_at: new Date().toISOString() };
    } else if (action === 'end') {
      update = { status: 'ended', ended_at: new Date().toISOString() };
    } else if (action === 'missed') {
      if (call.caller_id !== user.id) return NextResponse.json({ error: 'Only caller can mark missed' }, { status: 403 });
      update = { status: 'missed', ended_at: new Date().toISOString() };
    } else if (action === 'toggle_video') {
      if (call.caller_id === user.id) {
        update = { video_enabled_caller: video_enabled };
      } else {
        update = { video_enabled_receiver: video_enabled };
      }
    } else {
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    const { data: updated, error } = await supabase
      .from('calls')
      .update(update)
      .eq('id', callId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ call: updated });
  } catch (err) {
    console.error('PATCH /api/calls/:id error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
