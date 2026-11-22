import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { isAvailable } = body;

    const updates = {
      is_online: isAvailable !== false,
      last_seen_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (error) {
      return NextResponse.json({ error: 'Failed to update presence' }, { status: 500 });
    }

    return NextResponse.json({ success: true, is_online: updates.is_online, last_seen_at: updates.last_seen_at });
  } catch (err) {
    console.error('Presence error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
