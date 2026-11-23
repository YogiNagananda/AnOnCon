import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { snapAndFuzzCoordinates } from '@/lib/location/fuzzing';

// GET /api/nearby/presence — check own presence status
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = await createAdminClient();
    const { data: presence } = await admin
      .from('nearby_presence')
      .select('radius_preference, is_active, expires_at, last_updated_at')
      .eq('user_id', user.id)
      .maybeSingle();

    const isExpired = presence?.expires_at ? new Date(presence.expires_at) < new Date() : true;
    const isActive = Boolean(presence?.is_active && !isExpired);

    return NextResponse.json({
      is_active: isActive,
      radius_preference: presence?.radius_preference ?? 500,
      expires_at: presence?.expires_at ?? null,
      last_updated_at: presence?.last_updated_at ?? null,
    });
  } catch (err: any) {
    console.error('GET /api/nearby/presence error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/nearby/presence — opt-in, update location, or toggle off
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { latitude, longitude, radius_preference = 500, is_active = true } = body;

    const admin = await createAdminClient();

    // If turning Nearby Mode OFF: delete or deactivate presence immediately
    if (is_active === false) {
      await admin.from('nearby_presence').delete().eq('user_id', user.id);
      return NextResponse.json({ success: true, is_active: false });
    }

    if (latitude === undefined || longitude === undefined) {
      return NextResponse.json({ error: 'Latitude and longitude are required' }, { status: 400 });
    }

    const lat = Number(latitude);
    const lon = Number(longitude);
    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
    }

    const validRadius = [100, 500, 1000].includes(Number(radius_preference))
      ? Number(radius_preference)
      : 500;

    // Server-side privacy: snap to grid and apply deterministic fuzz offset
    const { fuzzedLat, fuzzedLon } = snapAndFuzzCoordinates(lat, lon, user.id);

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes inactivity timeout
    const nowIso = new Date().toISOString();

    // Upsert into nearby_presence (storing fuzzed coordinates)
    const { error: upsertError } = await admin
      .from('nearby_presence')
      .upsert({
        user_id: user.id,
        location: `SRID=4326;POINT(${fuzzedLon} ${fuzzedLat})`,
        fuzzed_location: `SRID=4326;POINT(${fuzzedLon} ${fuzzedLat})`,
        radius_preference: validRadius,
        is_active: true,
        last_updated_at: nowIso,
        expires_at: expiresAt,
      }, { onConflict: 'user_id' });

    if (upsertError) {
      console.error('Error upserting nearby presence:', upsertError);
      return NextResponse.json({ error: 'Failed to update nearby presence' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      is_active: true,
      radius_preference: validRadius,
      expires_at: expiresAt,
    });
  } catch (err: any) {
    console.error('POST /api/nearby/presence error:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/nearby/presence — deactivate presence immediately
export async function DELETE() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = await createAdminClient();
    await admin.from('nearby_presence').delete().eq('user_id', user.id);

    return NextResponse.json({ success: true, is_active: false });
  } catch (err: any) {
    console.error('DELETE /api/nearby/presence error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
