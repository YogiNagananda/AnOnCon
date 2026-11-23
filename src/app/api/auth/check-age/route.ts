import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdult, validateDOB } from '@/lib/auth/age-utils';
import type { Profile } from '@/lib/supabase/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { dob?: string };
    const { dob } = body;

    if (!dob) {
      return NextResponse.json({ error: 'Date of birth is required' }, { status: 400 });
    }

    const validation = validateDOB(dob);
    if (!validation.valid) {
      const isUnderage = validation.error?.includes('18');
      return NextResponse.json(
        { error: validation.error, isAdult: false },
        { status: isUnderage ? 403 : 400 }
      );
    }
    if (!isAdult(new Date(dob))) {
      return NextResponse.json({ error: 'You must be 18 or older', isAdult: false }, { status: 403 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check if profile already has DOB — cast to Profile to satisfy TS strict mode
    const { data: existingRaw } = await supabase
      .from('profiles')
      .select('dob')
      .eq('id', user.id)
      .single();
    const existing = existingRaw as Pick<Profile, 'dob'> | null;

    if (existing?.dob) {
      return NextResponse.json({ error: 'Date of birth already set' }, { status: 409 });
    }

    // Upsert profile with DOB
    const { error: upsertError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        dob,
        display_name: `anon_${user.id.slice(0, 8)}`,
      }, { onConflict: 'id' });

    if (upsertError) {
      return NextResponse.json({ error: 'Failed to save date of birth' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Check-age error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
