import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

// GET /api/groups?search=&tag=&page=
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = request.nextUrl;
    const search = searchParams.get('search') ?? '';
    const tag    = searchParams.get('tag') ?? '';
    const page   = Math.max(0, parseInt(searchParams.get('page') ?? '0', 10));
    const limit  = 20;

    const adminSupabase = await createAdminClient();

    let query = adminSupabase
      .from('groups')
      .select(`
        id, name, description, icon_url, tags, is_public, max_members, owner_id, created_at,
        group_members(count)
      `, { count: 'exact' })
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .range(page * limit, page * limit + limit - 1);

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }
    if (tag) {
      query = query.contains('tags', [tag]);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    // Also get user's joined groups via adminSupabase to prevent client RLS recursion
    const { data: myMemberships } = await adminSupabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', user.id)
      .eq('status', 'active');

    const joinedIds = new Set((myMemberships ?? []).map((g: { group_id: string }) => g.group_id));

    const enriched = (data ?? []).map((g: Record<string, unknown>) => ({
      ...g,
      member_count: (g.group_members as { count: number }[])?.[0]?.count ?? 0,
      is_joined: joinedIds.has(g.id as string),
      group_members: undefined,
    }));

    // Also load the user's joined groups list
    let myGroups: Record<string, unknown>[] = [];
    if (joinedIds.size > 0) {
      const { data: myGroupDetails } = await adminSupabase
        .from('groups')
        .select('*')
        .in('id', Array.from(joinedIds));

      myGroups = (myGroupDetails ?? []).map((g: Record<string, unknown>) => ({
        ...g,
        tags: g.tags ?? [],
        member_count: 0,
        is_joined: true,
      }));
    }

    return NextResponse.json({ groups: enriched, my_groups: myGroups, total: count ?? 0, page });
  } catch (err: any) {
    console.error('GET /api/groups error:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}

// POST /api/groups — create a group
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { name, description, tags, is_public, icon_url } = body;

    if (!name || name.length < 2 || name.length > 60) {
      return NextResponse.json({ error: 'Name must be 2–60 characters' }, { status: 400 });
    }

    const adminSupabase = await createAdminClient();

    const { data: group, error: gErr } = await adminSupabase
      .from('groups')
      .insert({
        name: name.trim(),
        description: description?.trim() ?? null,
        tags: Array.isArray(tags) ? tags.slice(0, 10) : [],
        is_public: is_public !== false,
        icon_url: icon_url ?? null,
        owner_id: user.id,
      })
      .select()
      .single();

    if (gErr) throw gErr;

    // Insert owner as member
    const { error: mErr } = await adminSupabase.from('group_members').insert({
      group_id: group.id,
      user_id: user.id,
      role: 'owner',
      status: 'active',
    });

    if (mErr) throw mErr;

    return NextResponse.json({ group }, { status: 201 });
  } catch (err: any) {
    console.error('POST /api/groups error:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}
