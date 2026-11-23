import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { calculateDistanceMeters, getDistanceBand } from '@/lib/location/fuzzing';

// GET /api/nearby?lat=&lon=&radius= — fetch nearby anonymous users with distance bands
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = request.nextUrl;
    const latParam = searchParams.get('lat');
    const lonParam = searchParams.get('lon');
    const radiusParam = searchParams.get('radius');

    const admin = await createAdminClient();

    // Clean expired or inactive presences
    const nowIso = new Date().toISOString();
    await admin
      .from('nearby_presence')
      .delete()
      .or(`expires_at.lt.${nowIso},is_active.eq.false`);

    // Get current user's presence record
    const { data: myPresence } = await admin
      .from('nearby_presence')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!myPresence || !myPresence.is_active || (myPresence.expires_at && new Date(myPresence.expires_at) < new Date())) {
      return NextResponse.json({
        users: [],
        nearby_active: false,
        message: 'Nearby mode is currently off',
      });
    }

    const maxRadius = [100, 500, 1000].includes(Number(radiusParam))
      ? Number(radiusParam)
      : myPresence.radius_preference || 500;

    // Try PostGIS database RPC first if available
    const userLat = latParam ? Number(latParam) : null;
    const userLon = lonParam ? Number(lonParam) : null;

    if (userLat !== null && userLon !== null && !isNaN(userLat) && !isNaN(userLon)) {
      const { data: rpcUsers, error: rpcError } = await (admin as any).rpc('find_nearby_users', {
        p_user_id: user.id,
        p_lat: userLat,
        p_lon: userLon,
        p_radius_meters: maxRadius,
      });

      if (!rpcError && Array.isArray(rpcUsers)) {
        return NextResponse.json({
          users: rpcUsers,
          nearby_active: true,
          radius: maxRadius,
        });
      }
    }

    // Fallback query if RPC isn't loaded yet:
    // Get all active presences except current user
    const { data: presences, error: pErr } = await admin
      .from('nearby_presence')
      .select('user_id, fuzzed_location, last_updated_at')
      .neq('user_id', user.id)
      .eq('is_active', true)
      .gt('expires_at', nowIso);

    if (pErr) throw pErr;

    if (!presences || presences.length === 0) {
      return NextResponse.json({ users: [], nearby_active: true, radius: maxRadius });
    }

    const candidateIds = presences.map((p) => p.user_id);

    // Filter out blocked users
    const { data: blocks } = await admin
      .from('blocks')
      .select('blocked_id, blocker_id')
      .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`);

    const blockedSet = new Set<string>();
    (blocks ?? []).forEach((b) => {
      if (b.blocker_id === user.id) blockedSet.add(b.blocked_id);
      if (b.blocked_id === user.id) blockedSet.add(b.blocker_id);
    });

    const allowedIds = candidateIds.filter((id) => !blockedSet.has(id));

    // Fetch public profile cards
    const { data: profiles } = await admin
      .from('public_profiles')
      .select('id, display_name, avatar_url, age_range, gender, bio, interests, languages')
      .in('id', allowedIds)
      .eq('is_visible', true)
      .eq('is_banned', false)
      .eq('is_suspended', false);

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

    // Match profiles with distance bands (no exact coordinates returned!)
    const matchedUsers: any[] = [];

    for (const p of presences) {
      if (!profileMap.has(p.user_id)) continue;
      const prof = profileMap.get(p.user_id)!;

      // Extract coordinates if available in geometry string or fallback
      let distBand: 'within 100 m' | 'within 500 m' | 'within 1 km' = 'within 500 m';

      if (userLat !== null && userLon !== null && typeof p.fuzzed_location === 'string') {
        const match = p.fuzzed_location.match(/POINT\(([^ ]+) ([^)]+)\)/);
        if (match) {
          const lon2 = parseFloat(match[1]);
          const lat2 = parseFloat(match[2]);
          const dMeters = calculateDistanceMeters(userLat, userLon, lat2, lon2);
          if (dMeters > maxRadius) continue;
          distBand = getDistanceBand(dMeters) as any;
        }
      }

      matchedUsers.push({
        user_id: prof.id,
        display_name: prof.display_name,
        avatar_url: prof.avatar_url,
        age_range: prof.age_range,
        gender: prof.gender,
        bio: prof.bio,
        interests: prof.interests,
        languages: prof.languages,
        distance_band: distBand,
        last_seen_at: p.last_updated_at,
      });
    }

    return NextResponse.json({
      users: matchedUsers,
      nearby_active: true,
      radius: maxRadius,
    });
  } catch (err: any) {
    console.error('GET /api/nearby error:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}
