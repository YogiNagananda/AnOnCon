import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/security/rateLimit';
import { sanitizeInput } from '@/lib/security/sanitize';

const MAX_MOOD_LENGTH = 60;

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('mood_status, mood_updated_at')
      .eq('id', user.id)
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to load mood status' }, { status: 500 });
    }

    return NextResponse.json({
      mood_status: data?.mood_status ?? null,
      mood_updated_at: data?.mood_updated_at ?? null,
    });
  } catch (err) {
    console.error('GET /api/settings/mood error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const limitCheck = checkRateLimit(user.id, 'profile_update');
    if (!limitCheck.success) {
      return NextResponse.json(
        { error: `Too many mood updates. Please wait ${limitCheck.resetSeconds}s.` },
        { status: 429, headers: { 'Retry-After': String(limitCheck.resetSeconds) } }
      );
    }

    const body = await request.json();
    const rawMood = typeof body?.mood_status === 'string' ? body.mood_status.trim() : '';

    if (rawMood.length > MAX_MOOD_LENGTH) {
      return NextResponse.json(
        { error: `Mood status cannot exceed ${MAX_MOOD_LENGTH} characters` },
        { status: 400 }
      );
    }

    const cleanMood = rawMood ? sanitizeInput(rawMood, MAX_MOOD_LENGTH) : null;
    const moodUpdatedAt = cleanMood ? new Date().toISOString() : null;

    const { error } = await supabase
      .from('profiles')
      .update({
        mood_status: cleanMood,
        mood_updated_at: moodUpdatedAt,
      })
      .eq('id', user.id);

    if (error) {
      console.error('Update mood status error:', error);
      return NextResponse.json({ error: 'Failed to update mood status' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      mood_status: cleanMood,
      mood_updated_at: moodUpdatedAt,
    });
  } catch (err) {
    console.error('POST /api/settings/mood error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
