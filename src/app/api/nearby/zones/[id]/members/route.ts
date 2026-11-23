import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

type Params = { params: Promise<{ id: string }> };

// PATCH /api/nearby/zones/:id/members — organizer moderation: remove or ban
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id: zoneId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { target_user_id, action } = body;
    // action: 'remove' | 'ban' | 'unban'

    if (!target_user_id || !action) {
      return NextResponse.json({ error: 'target_user_id and action are required' }, { status: 400 });
    }

    const admin = await createAdminClient();

    // Verify requester is the organizer
    const { data: zone } = await admin.from('event_zones').select('organizer_id').eq('id', zoneId).single();
    if (!zone || zone.organizer_id !== user.id) {
      return NextResponse.json({ error: 'Only the event organizer can moderate members' }, { status: 403 });
    }

    if (target_user_id === user.id) {
      return NextResponse.json({ error: 'Cannot moderate yourself' }, { status: 400 });
    }

    if (action === 'remove') {
      await admin.from('event_zone_members').delete().eq('zone_id', zoneId).eq('user_id', target_user_id);
      return NextResponse.json({ success: true, message: 'User removed from event zone' });
    }

    if (action === 'ban') {
      await admin.from('event_zone_members').update({ is_banned: true }).eq('zone_id', zoneId).eq('user_id', target_user_id);
      return NextResponse.json({ success: true, message: 'User banned from event zone' });
    }

    if (action === 'unban') {
      await admin.from('event_zone_members').update({ is_banned: false }).eq('zone_id', zoneId).eq('user_id', target_user_id);
      return NextResponse.json({ success: true, message: 'User unbanned' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    console.error('PATCH /api/nearby/zones/:id/members error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
