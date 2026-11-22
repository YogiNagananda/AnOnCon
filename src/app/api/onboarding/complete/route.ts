import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { profileSchema } from '@/lib/validations';
import { calculateAge } from '@/lib/auth/age-utils';
import type { Profile, ProfileInsert, ProfileUpdate } from '@/lib/supabase/types';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();

    const result = profileSchema.safeParse(body);
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        errors[issue.path[0] as string] = issue.message;
      });
      return NextResponse.json({ error: 'Validation failed', errors }, { status: 400 });
    }

    // Check display name uniqueness
    const { data: existingRaw } = await supabase
      .from('profiles')
      .select('id')
      .eq('display_name', result.data.display_name)
      .neq('id', user.id)
      .maybeSingle();
    const existing = existingRaw as Pick<Profile, 'id'> | null;

    if (existing) {
      return NextResponse.json({ error: 'Display name is already taken' }, { status: 409 });
    }

    // Check if profile already exists
    const { data: existingProfileRaw } = await supabase
      .from('profiles')
      .select('id, dob')
      .eq('id', user.id)
      .maybeSingle();
    const existingProfile = existingProfileRaw as Pick<Profile, 'id' | 'dob'> | null;

    // Build update fields
    const updateFields: ProfileUpdate = {
      display_name: result.data.display_name,
      avatar_url: (body.avatar_url as string) || null,
      gender: result.data.gender as Profile['gender'],
      bio: result.data.bio || null,
      interests: result.data.interests as string[],
      languages: result.data.languages as string[],
      area: (body.area ?? null) as Profile['area'],
    };

    if (existingProfile) {
      const { error } = await supabase.from('profiles').update(updateFields).eq('id', user.id);
      if (error) return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    } else {
      if (!body.dob) {
        return NextResponse.json({ error: 'Date of birth is required' }, { status: 400 });
      }
      const age = calculateAge(new Date(body.dob as string));
      if (age < 18) {
        return NextResponse.json({ error: 'You must be at least 18 years old' }, { status: 403 });
      }
      const insertPayload: ProfileInsert = {
        id: user.id,
        dob: body.dob as string,
        ...updateFields,
        display_name: result.data.display_name,
      };
      const { error } = await supabase.from('profiles').insert(insertPayload);
      if (error) return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Onboarding error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
