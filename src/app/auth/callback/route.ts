import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/lib/supabase/types';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  if (error) {
    return NextResponse.redirect(`${origin}/auth/login?error=${encodeURIComponent(errorDescription ?? error)}`);
  }
  if (!code) {
    return NextResponse.redirect(`${origin}/auth/login?error=${encodeURIComponent('Missing authorization code')}`);
  }

  // Target destination URL
  let targetUrl = `${origin}/onboarding?needs_dob=true`;

  const response = NextResponse.redirect(targetUrl);

  try {
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('Session exchange error:', exchangeError);
      return NextResponse.redirect(`${origin}/auth/login?error=${encodeURIComponent(exchangeError.message)}`);
    }

    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, dob')
        .eq('id', user.id)
        .single() as { data: Pick<ProfileRow, 'display_name' | 'dob'> | null; error: unknown };

      if (!profile?.dob) {
        targetUrl = `${origin}/onboarding?needs_dob=true`;
      } else if (!profile.display_name) {
        targetUrl = `${origin}/onboarding`;
      } else {
        targetUrl = `${origin}/dashboard`;
      }
    }

    // Set location header to resolved destination with all auth cookies preserved on response
    response.headers.set('Location', targetUrl);
    return response;
  } catch (err) {
    console.error('Callback error:', err);
    return NextResponse.redirect(`${origin}/auth/login?error=${encodeURIComponent('Authentication failed')}`);
  }
}
