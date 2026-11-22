import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';



export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const searchParams = request.nextUrl.searchParams;
    const gender = searchParams.get('gender');
    const ageMin = searchParams.get('age_min') ? parseInt(searchParams.get('age_min')!) : undefined;
    const ageMax = searchParams.get('age_max') ? parseInt(searchParams.get('age_max')!) : undefined;
    const country = searchParams.get('country');
    const state = searchParams.get('state');
    const city = searchParams.get('city');
    const language = searchParams.get('language');
    const interestsParam = searchParams.get('interests');
    const interests = interestsParam ? interestsParam.split(',').filter(Boolean) : undefined;
    const randomOnly = searchParams.get('random_pool') === 'true';

    // 1. Fetch blocked user IDs (either blocker or blocked)
    const { data: blocks } = await supabase
      .from('blocks')
      .select('blocker_id, blocked_id')
      .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`);

    const blockedUserIds = new Set<string>();
    blocks?.forEach((b) => {
      if (b.blocker_id === user.id) blockedUserIds.add(b.blocked_id);
      if (b.blocked_id === user.id) blockedUserIds.add(b.blocker_id);
    });

    // 2. Fetch pending or accepted connection request user IDs to know request status
    const { data: requests } = await supabase
      .from('connection_requests')
      .select('id, sender_id, receiver_id, status')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .in('status', ['pending', 'accepted']);

    const connectedMap = new Map<string, { status: string; requestId: string; isSender: boolean }>();
    requests?.forEach((r) => {
      const otherId = r.sender_id === user.id ? r.receiver_id : r.sender_id;
      connectedMap.set(otherId, {
        status: r.status,
        requestId: r.id,
        isSender: r.sender_id === user.id,
      });
    });

    // 3. Query public_profiles
    let query = supabase
      .from('public_profiles')
      .select('*')
      .neq('id', user.id)
      .eq('is_visible', true)
      .eq('is_banned', false)
      .eq('is_suspended', false);

    if (gender && gender !== 'all') {
      query = query.eq('gender', gender as 'male' | 'female' | 'non-binary' | 'prefer-not-to-say');
    }

    if (language && language !== 'all') {
      query = query.contains('languages', [language]);
    }

    if (country && country !== 'all') {
      query = query.contains('area', { country });
    }

    if (city) {
      query = query.contains('area', { city });
    }

    if (randomOnly) {
      // Must have been seen in last 15 minutes
      const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      query = query.gte('last_seen_at', fifteenMinsAgo);
    }

    const { data: profiles, error } = await query.limit(50);

    if (error) {
      console.error('Discover query error:', error);
      return NextResponse.json({ error: 'Failed to search profiles' }, { status: 500 });
    }

    // 4. Post-filter in memory: blocks, interests, age brackets
    const results = (profiles || [])
      .filter((p) => !blockedUserIds.has(p.id))
      .filter((p) => {
        if (!interests || interests.length === 0) return true;
        const userInterests = p.interests;
        if (!userInterests || userInterests.length === 0) return false;
        return interests.some((interest) => userInterests.includes(interest));
      })
      .map((p) => ({
        ...p,
        connectionStatus: connectedMap.get(p.id) || null,
      }));

    return NextResponse.json({ profiles: results });
  } catch (err) {
    console.error('Discover error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
