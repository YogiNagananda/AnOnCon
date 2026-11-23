import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { signupSchema } from '@/lib/validations';
import { isAdult, validateDOB } from '@/lib/auth/age-utils';
import { checkRateLimit, getClientIp } from '@/lib/security/rateLimit';
import { verifyTurnstileToken } from '@/lib/security/captcha';
import type { Database } from '@/lib/supabase/types';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request.headers);
    const limitCheck = checkRateLimit(ip, 'signup');
    if (!limitCheck.success) {
      return NextResponse.json(
        { error: `Too many signup attempts from this network. Please wait ${limitCheck.resetSeconds}s.` },
        { status: 429, headers: { 'Retry-After': String(limitCheck.resetSeconds) } }
      );
    }

    const body = await request.json();

    // 1. CAPTCHA verification (Cloudflare Turnstile)
    const captchaResult = await verifyTurnstileToken(body.captchaToken, ip);
    if (!captchaResult.success) {
      return NextResponse.json(
        { error: captchaResult.error || 'CAPTCHA verification failed. Please complete the security check.' },
        { status: 400 }
      );
    }

    // 2. Validate Terms & 18+ confirmation
    if (body.confirmAdult !== true || body.agreedToTerms !== true) {
      return NextResponse.json(
        {
          error: 'You must confirm that you are at least 18 years of age and agree to the Terms of Service and Community Guidelines.',
        },
        { status: 400 }
      );
    }

    // 3. Validate with zod
    const result = signupSchema.safeParse(body);
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        errors[issue.path[0] as string] = issue.message;
      });
      return NextResponse.json({ error: 'Validation failed', errors }, { status: 400 });
    }

    const { email, password, dob } = result.data;

    // 4. Hard server-side 18+ age check
    const dobValidation = validateDOB(dob);
    if (!dobValidation.valid) {
      return NextResponse.json(
        { error: dobValidation.error, errors: { dob: dobValidation.error } },
        { status: 400 }
      );
    }
    if (!isAdult(new Date(dob))) {
      return NextResponse.json(
        { error: 'You must be 18 or older to register.', errors: { dob: 'You must be 18 or older' } },
        { status: 403 }
      );
    }

    // 5. Admin client for privileged operations (bypasses RLS)
    const supabaseAdmin = createSupabaseAdmin<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 6. Check against flagged banned_identifiers (device / IP fingerprint)
    const ipHash = crypto.createHash('sha256').update(ip).digest('hex');
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const deviceHash = crypto.createHash('sha256').update(userAgent).digest('hex');

    const { data: bannedMatches } = await supabaseAdmin
      .from('banned_identifiers')
      .select('id, reason')
      .or(`ip_hash.eq.${ipHash},device_hash.eq.${deviceHash}`)
      .limit(1);

    if (bannedMatches && bannedMatches.length > 0) {
      return NextResponse.json(
        { error: 'Registration from this device or network was flagged for safety and security violations.' },
        { status: 403 }
      );
    }

    // 7. Create user in Supabase Auth
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

    // 8. Insert initial profile row with DOB
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id,
        dob,
        display_name: `anon_${authData.user.id.slice(0, 8)}`,
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
    }

    // 9. Send confirmation magic-link email
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
