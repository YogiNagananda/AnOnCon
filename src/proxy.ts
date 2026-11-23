import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/lib/supabase/types';

const PUBLIC_ROUTES = [
  '/',
  '/auth/login',
  '/auth/signup',
  '/auth/callback',
  '/auth/banned',
  '/terms',
  '/privacy',
  '/guidelines',
  '/safety',
];

const AUTH_ROUTES = ['/auth/login', '/auth/signup'];
const PROTECTED_PREFIXES = ['/dashboard', '/settings', '/onboarding', '/groups', '/admin'];

export async function proxy(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith('/terms') || pathname.startsWith('/privacy') || pathname.startsWith('/guidelines') || pathname.startsWith('/safety'));
  const isAuthRoute = AUTH_ROUTES.includes(pathname);
  const isProtectedRoute = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  // Redirect unauthenticated users away from protected routes
  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/login';
    url.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(url);
  }

  // If user is authenticated and accessing protected pages or auth pages
  if (user && (isProtectedRoute || isAuthRoute)) {
    // Check if user is banned or suspended via service client
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: () => {},
        },
      }
    );

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_banned, is_suspended, suspended_until')
      .eq('id', user.id)
      .maybeSingle();

    if (profile) {
      const isSuspended =
        profile.is_suspended &&
        profile.suspended_until &&
        new Date(profile.suspended_until) > new Date();

      if (profile.is_banned || isSuspended) {
        if (pathname !== '/auth/banned') {
          const url = request.nextUrl.clone();
          url.pathname = '/auth/banned';
          return NextResponse.redirect(url);
        }
        return supabaseResponse;
      }

      // Check admin route access
      if (pathname.startsWith('/admin') && profile.role !== 'admin') {
        const url = request.nextUrl.clone();
        url.pathname = '/dashboard';
        return NextResponse.redirect(url);
      }
    }

    // Authenticated non-banned user on login/signup page -> send to dashboard
    if (isAuthRoute) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files & assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
