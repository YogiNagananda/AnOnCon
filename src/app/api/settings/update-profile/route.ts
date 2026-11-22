import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { DISPLAY_NAME_COOLDOWN_DAYS, MAX_BIO_LENGTH } from '@/lib/constants';
import type { Profile, ProfileUpdate } from '@/lib/supabase/types';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const updates: ProfileUpdate = {};

    if (body.display_name) {
      const { data: profileRaw } = await supabase
        .from('profiles')
        .select('display_name, display_name_changed_at')
        .eq('id', user.id)
        .single();
      const profile = profileRaw as Pick<Profile, 'display_name' | 'display_name_changed_at'> | null;

      if (profile && body.display_name !== profile.display_name) {
        // Check 7-day cooldown before allowing name change
        if (profile.display_name_changed_at) {
          const cooldownEnd = new Date(
            new Date(profile.display_name_changed_at).getTime() + DISPLAY_NAME_COOLDOWN_DAYS * 86400000
          );
          if (new Date() < cooldownEnd) {
            return NextResponse.json(
              { error: `You can change your display name again on ${cooldownEnd.toLocaleDateString()}` },
              { status: 429 }
            );
          }
        }

        // Ensure uniqueness
        const { data: existingRaw } = await supabase
          .from('profiles')
          .select('id')
          .eq('display_name', body.display_name as string)
          .neq('id', user.id)
          .maybeSingle();
        const existing = existingRaw as Pick<Profile, 'id'> | null;
        if (existing) return NextResponse.json({ error: 'Display name is already taken' }, { status: 409 });

        if (!/^[a-zA-Z0-9_]{3,30}$/.test(body.display_name as string)) {
          return NextResponse.json({ error: 'Invalid display name format' }, { status: 400 });
        }

        updates.display_name = body.display_name as string;
        updates.display_name_changed_at = new Date().toISOString();
      }
    }

    if (body.bio !== undefined) {
      if (body.bio && (body.bio as string).length > MAX_BIO_LENGTH) {
        return NextResponse.json({ error: 'Bio is too long' }, { status: 400 });
      }
      updates.bio = (body.bio as string) || null;
    }

    if (body.gender) updates.gender = body.gender as Profile['gender'];
    if (body.interests) updates.interests = body.interests as string[];
    if (body.languages) updates.languages = body.languages as string[];
    if (body.is_visible !== undefined) updates.is_visible = body.is_visible as boolean;

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
      if (error) return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Settings error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
