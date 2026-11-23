import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/security/rateLimit';
import { sanitizeInput } from '@/lib/security/sanitize';



export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const type = request.nextUrl.searchParams.get('type') || 'all'; // incoming | outgoing | all

    // 1. Fetch incoming requests
    let incomingQuery = supabase
      .from('connection_requests')
      .select('*, sender:profiles!connection_requests_sender_id_fkey(id, display_name, avatar_url, bio, interests, languages, area)')
      .eq('receiver_id', user.id);

    // 2. Fetch outgoing requests
    let outgoingQuery = supabase
      .from('connection_requests')
      .select('*, receiver:profiles!connection_requests_receiver_id_fkey(id, display_name, avatar_url, bio, interests, languages, area)')
      .eq('sender_id', user.id);

    const [incomingRes, outgoingRes] = await Promise.all([
      type === 'outgoing' ? Promise.resolve({ data: [] }) : incomingQuery.order('created_at', { ascending: false }),
      type === 'incoming' ? Promise.resolve({ data: [] }) : outgoingQuery.order('created_at', { ascending: false }),
    ]);

    return NextResponse.json({
      incoming: incomingRes.data || [],
      outgoing: outgoingRes.data || [],
    });
  } catch (err) {
    console.error('Fetch requests error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Rate limiting: max 20 requests per hour
    const limitCheck = checkRateLimit(user.id, 'requests');
    if (!limitCheck.success) {
      return NextResponse.json(
        { error: `Too many connection requests. Please wait ${limitCheck.resetSeconds}s before sending another.` },
        { status: 429, headers: { 'Retry-After': String(limitCheck.resetSeconds) } }
      );
    }

    const body = await request.json();
    const { receiver_id, intro } = body;
    const cleanIntro = intro ? sanitizeInput(intro, 500) : null;

    if (!receiver_id) {
      return NextResponse.json({ error: 'Receiver ID is required' }, { status: 400 });
    }
    if (receiver_id === user.id) {
      return NextResponse.json({ error: 'You cannot connect with yourself' }, { status: 400 });
    }

    if (intro && intro.length > 140) {
      return NextResponse.json({ error: 'Intro message cannot exceed 140 characters' }, { status: 400 });
    }

    // Rate Limit: Max 20 requests per hour per user
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentCount } = await supabase
      .from('connection_requests')
      .select('*', { count: 'exact', head: true })
      .eq('sender_id', user.id)
      .gte('created_at', oneHourAgo);

    if ((recentCount || 0) >= 20) {
      return NextResponse.json({ error: 'Rate limit exceeded: Maximum 20 connection requests per hour.' }, { status: 429 });
    }

    // Check if blocked in either direction
    const { data: blocks } = await supabase
      .from('blocks')
      .select('id')
      .or(`and(blocker_id.eq.${user.id},blocked_id.eq.${receiver_id}),and(blocker_id.eq.${receiver_id},blocked_id.eq.${user.id})`)
      .limit(1);

    if (blocks && blocks.length > 0) {
      return NextResponse.json({ error: 'Unable to send connection request' }, { status: 403 });
    }

    // Check if a pending request already exists between them
    const { data: existingPending } = await supabase
      .from('connection_requests')
      .select('id, status, sender_id')
      .eq('status', 'pending')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${receiver_id}),and(sender_id.eq.${receiver_id},receiver_id.eq.${user.id})`)
      .limit(1);

    if (existingPending && existingPending.length > 0) {
      return NextResponse.json({ error: 'A pending request already exists between you' }, { status: 409 });
    }

    // Check 24-hour rejection cooldown (if sender previously got rejected by receiver)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentRejection } = await supabase
      .from('connection_requests')
      .select('id, responded_at')
      .eq('sender_id', user.id)
      .eq('receiver_id', receiver_id)
      .eq('status', 'rejected')
      .gte('responded_at', twentyFourHoursAgo)
      .limit(1);

    if (recentRejection && recentRejection.length > 0) {
      return NextResponse.json({
        error: 'You must wait 24 hours after a rejection before sending another request to this person.',
      }, { status: 429 });
    }

    // Create request with 48h expiration
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    const { data: newRequest, error: insertError } = await supabase
      .from('connection_requests')
      .insert({
        sender_id: user.id,
        receiver_id,
        intro: cleanIntro,
        status: 'pending',
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Request insert error:', insertError);
      return NextResponse.json({ error: 'Failed to send request' }, { status: 500 });
    }

    return NextResponse.json({ success: true, request: newRequest }, { status: 201 });
  } catch (err) {
    console.error('Send request error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
