import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

// GET /api/nearby/zones — list active event zones
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = await createAdminClient();
    const nowIso = new Date().toISOString();

    const { data: zones, error } = await admin
      .from('event_zones')
      .select('id, name, description, radius_meters, join_code, organizer_id, starts_at, ends_at, created_at')
      .eq('is_active', true)
      .or(`ends_at.is.null,ends_at.gt.${nowIso}`)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Check my memberships
    const { data: memberships } = await admin
      .from('event_zone_members')
      .select('zone_id')
      .eq('user_id', user.id)
      .eq('is_banned', false);

    const joinedSet = new Set((memberships ?? []).map((m) => m.zone_id));

    // Get member counts for each zone
    const enriched = await Promise.all(
      (zones ?? []).map(async (z) => {
        const { count } = await admin
          .from('event_zone_members')
          .select('*', { count: 'exact', head: true })
          .eq('zone_id', z.id)
          .eq('is_banned', false);

        return {
          ...z,
          member_count: count ?? 0,
          is_joined: joinedSet.has(z.id),
          is_organizer: z.organizer_id === user.id,
        };
      })
    );

    return NextResponse.json({ zones: enriched });
  } catch (err: any) {
    console.error('GET /api/nearby/zones error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/nearby/zones — create an event zone
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { name, description, latitude, longitude, radius_meters = 500, starts_at, ends_at, join_code } = body;

    if (!name || name.trim().length < 2 || name.trim().length > 80) {
      return NextResponse.json({ error: 'Name must be 2–80 characters' }, { status: 400 });
    }

    const radius = Math.min(Math.max(Number(radius_meters) || 500, 50), 2000); // capped at 2 km max

    const lat = Number(latitude) || 0;
    const lon = Number(longitude) || 0;

    // Generate or format 6-character uppercase join code
    let code = (join_code || Math.random().toString(36).substring(2, 8)).toUpperCase().trim();
    if (code.length < 4 || code.length > 10) {
      code = Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    const admin = await createAdminClient();

    const { data: zone, error: zErr } = await admin
      .from('event_zones')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        organizer_id: user.id,
        center: `SRID=4326;POINT(${lon} ${lat})`,
        radius_meters: radius,
        join_code: code,
        is_active: true,
        starts_at: starts_at || new Date().toISOString(),
        ends_at: ends_at || null,
      })
      .select()
      .single();

    if (zErr) {
      console.error('Create zone error:', zErr);
      return NextResponse.json({ error: zErr.message || 'Failed to create event zone' }, { status: 400 });
    }

    // Auto-join organizer as first member
    await admin.from('event_zone_members').insert({
      zone_id: zone.id,
      user_id: user.id,
      is_banned: false,
    });

    return NextResponse.json({ zone }, { status: 201 });
  } catch (err: any) {
    console.error('POST /api/nearby/zones error:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}
