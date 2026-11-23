import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export interface AdminUser {
  id: string;
  email?: string;
  role: string;
}

/**
 * Verifies that the current caller is authenticated and has the 'admin' role in public.profiles.
 * Returns the admin user info or null if unauthorized/forbidden.
 */
export async function verifyAdmin(): Promise<{ adminUser: AdminUser | null; errorResponse: NextResponse | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return {
      adminUser: null,
      errorResponse: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  const adminClient = await createAdminClient();
  const { data: profile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    return {
      adminUser: null,
      errorResponse: NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 }),
    };
  }

  return {
    adminUser: { id: user.id, email: user.email, role: profile.role },
    errorResponse: null,
  };
}
