import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { signupSchema } from '@/lib/validations';
import { isAdult, validateDOB } from '@/lib/auth/age-utils';
import type { Database } from '@/lib/supabase/types';

// Simple in-memory rate limiter: max 5 signups per IP per hour
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded?.split(',')[0]?.trim() ?? 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: 'Too many signup attempts. Try again later.' }, { status: 429 });
    }

    const body = await request.json();

    // Validate with zod
    const result = signupSchema.safeParse(body);
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        errors[issue.path[0] as string] = issue.message;
      });
      return NextResponse.json({ error: 'Validation failed', errors }, { status: 400 });
    }

    const { email, password, dob } = result.data;

    // Hard server-side 18+ age check — never trust client
    const dobValidation = validateDOB(dob);
    if (!dobValidation.valid) {
      return NextResponse.json(
        { error: dobValidation.error, errors: { dob: dobValidation.error } },
        { status: 400 }
      );
    }
    if (!isAdult(new Date(dob))) {
      return NextResponse.json(
        { error: 'You must be 18 or older', errors: { dob: 'You must be 18 or older' } },
        { status: 403 }
      );
    }

    // Admin client for privileged operations (bypasses RLS)
    const supabaseAdmin = createSupabaseAdmin<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
    });

    if (authError) {
      if (authError.message.includes('already') || authError.message.includes('exists')) {
        return NextResponse.json(
          { error: 'An account with this email already exists', errors: { email: 'Email already in use' } },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
    }

    // Insert initial profile row with DOB
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id,
        dob,
        display_name: `anon_${authData.user.id.slice(0, 8)}`,
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      // Non-critical: user can complete profile during onboarding
    }

    // Send confirmation magic-link email
    try {
      await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: { redirectTo: `${request.nextUrl.origin}/auth/verify` },
      });
    } catch (otpErr) {
      console.error('Email verification error:', otpErr);
    }

    return NextResponse.json(
      { message: 'Account created. Check your email to verify.', userId: authData.user.id },
      { status: 201 }
    );
  } catch (err) {
    console.error('Signup error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
