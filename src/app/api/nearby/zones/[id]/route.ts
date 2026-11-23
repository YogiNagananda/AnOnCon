import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

type Params = { params: Promise<{ id: string }> };

// GET /api/nearby/zones/:id — zone details and "who's here" list
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = await createAdminClient();

    const { data: zone, error } = await admin
      .from('event_zones')
      .select('id, name, description, radius_meters, join_code, organizer_id, is_active, starts_at, ends_at, created_at')
      .eq('id', id)
      .single();

    if (error || !zone) return NextResponse.json({ error: 'Event zone not found' }, { status: 404 });

    // Check if zone has expired
    if (zone.ends_at && new Date(zone.ends_at) < new Date()) {
      return NextResponse.json({ error: 'This event zone has concluded' }, { status: 410 });
    }

    // Check my membership status
    const { data: myMem } = await admin
      .from('event_zone_members')
      .select('id, is_banned')
      .eq('zone_id', id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (myMem?.is_banned) {
      return NextResponse.json({ error: 'You are banned from this event zone' }, { status: 403 });
    }

    // Try RPC for safe member list without coordinates
    const { data: rpcMembers, error: rpcErr } = await (admin as any).rpc('get_zone_members_list', {
      p_zone_id: id,
      p_user_id: user.id,
    });

    let members: any[] = Array.isArray(rpcMembers) ? rpcMembers : [];

    if (rpcErr || !Array.isArray(members)) {
      // Fallback query
      const { data: rawMembers } = await admin
        .from('event_zone_members')
        .select('user_id, created_at, is_banned')
        .eq('zone_id', id)
        .eq('is_banned', false);

      const userIds = (rawMembers ?? []).map((m) => m.user_id);
      const { data: profiles } = await admin
        .from('public_profiles')
        .select('id, display_name, avatar_url, age_range, gender, bio, interests')
        .in('id', userIds)
        .eq('is_visible', true)
        .eq('is_banned', false);

      const pMap = new Map((profiles ?? []).map((p) => [p.id, p]));
      members = (rawMembers ?? [])
        .map((m) => {
          const prof = pMap.get(m.user_id);
          if (!prof) return null;
          return {
            user_id: prof.id,
            display_name: prof.display_name,
            avatar_url: prof.avatar_url,
            age_range: prof.age_range,
            gender: prof.gender,
            bio: prof.bio,
            interests: prof.interests,
            is_banned: m.is_banned,
            joined_at: m.created_at,
          };
        })
        .filter(Boolean);
    }

    return NextResponse.json({
      zone,
      is_member: Boolean(myMem),
      is_organizer: zone.organizer_id === user.id,
      members: members ?? [],
    });
  } catch (err: any) {
    console.error('GET /api/nearby/zones/:id error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/nearby/zones/:id — organizer auto-closes or deletes zone
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = await createAdminClient();
    const { data: zone } = await admin.from('event_zones').select('organizer_id').eq('id', id).single();
    if (!zone || zone.organizer_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden — only the organizer can close the zone' }, { status: 403 });
    }

    await admin.from('event_zones').update({ is_active: false }).eq('id', id);

    return NextResponse.json({ success: true, message: 'Event zone closed' });
  } catch (err: any) {
    console.error('DELETE /api/nearby/zones/:id error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
