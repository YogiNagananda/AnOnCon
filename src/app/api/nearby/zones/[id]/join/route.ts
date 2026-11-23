import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { calculateDistanceMeters } from '@/lib/location/fuzzing';

type Params = { params: Promise<{ id: string }> };

// POST /api/nearby/zones/:id/join — join zone via join code OR geofence proximity
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id: zoneId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const { join_code, latitude, longitude } = body;

    const admin = await createAdminClient();

    const { data: zone, error } = await admin
      .from('event_zones')
      .select('*')
      .eq('id', zoneId)
      .single();

    if (error || !zone || !zone.is_active) {
      return NextResponse.json({ error: 'Event zone not found or inactive' }, { status: 404 });
    }

    if (zone.ends_at && new Date(zone.ends_at) < new Date()) {
      return NextResponse.json({ error: 'This event zone has ended' }, { status: 410 });
    }

    // Check if user is banned from this zone
    const { data: existing } = await admin
      .from('event_zone_members')
      .select('id, is_banned')
      .eq('zone_id', zoneId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing?.is_banned) {
      return NextResponse.json({ error: 'You are banned from this event zone' }, { status: 403 });
    }

    if (existing) {
      return NextResponse.json({ success: true, message: 'Already a member' });
    }

    // Validation: Either matching join_code OR user is inside the geofence radius
    let canJoin = false;

    if (join_code && join_code.trim().toUpperCase() === zone.join_code.toUpperCase()) {
      canJoin = true;
    } else if (latitude !== undefined && longitude !== undefined && typeof zone.center === 'string') {
      const match = zone.center.match(/POINT\(([^ ]+) ([^)]+)\)/);
      if (match) {
        const centerLon = parseFloat(match[1]);
        const centerLat = parseFloat(match[2]);
        const distance = calculateDistanceMeters(Number(latitude), Number(longitude), centerLat, centerLon);
        if (distance <= zone.radius_meters) {
          canJoin = true;
        }
      }
    }

    if (!canJoin) {
      return NextResponse.json({
        error: 'Invalid join code or you are outside the event geofence',
      }, { status: 400 });
    }

    // Insert membership
    const { error: insertErr } = await admin
      .from('event_zone_members')
      .insert({
        zone_id: zoneId,
        user_id: user.id,
        is_banned: false,
      });

    if (insertErr) {
      console.error('Zone join error:', insertErr);
      return NextResponse.json({ error: 'Failed to join event zone' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Joined event zone!' });
  } catch (err: any) {
    console.error('POST /api/nearby/zones/:id/join error:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}
