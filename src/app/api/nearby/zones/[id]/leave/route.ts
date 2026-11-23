import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

type Params = { params: Promise<{ id: string }> };

// POST /api/nearby/zones/:id/leave — leave zone
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const { id: zoneId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = await createAdminClient();

    // Organizers cannot leave their own zone (they can close it)
    const { data: zone } = await admin.from('event_zones').select('organizer_id').eq('id', zoneId).single();
    if (zone?.organizer_id === user.id) {
      return NextResponse.json({ error: 'Organizer cannot leave — close the zone to end it' }, { status: 400 });
    }

    await admin.from('event_zone_members').delete().eq('zone_id', zoneId).eq('user_id', user.id);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('POST /api/nearby/zones/:id/leave error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
