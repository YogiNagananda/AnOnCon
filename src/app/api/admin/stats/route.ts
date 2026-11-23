import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth/admin';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET() {
  const { adminUser, errorResponse } = await verifyAdmin();
  if (errorResponse) return errorResponse;
  if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const admin = await createAdminClient();

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // 1. Total users
    const { count: totalUsers } = await admin
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // 2. Active users today (last_seen_at >= startOfToday or is_online = true)
    const { count: activeToday } = await admin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .or(`last_seen_at.gte.${startOfToday},is_online.eq.true`);

    // 3. Open reports
    const { count: openReports } = await admin
      .from('reports')
      .select('*', { count: 'exact', head: true })
      .in('status', ['pending', 'reviewing']);

    // 4. Bans this week
    const { count: bansThisWeek } = await admin
      .from('moderation_actions')
      .select('*', { count: 'exact', head: true })
      .eq('action', 'ban')
      .gte('created_at', sevenDaysAgo);

    // 5. Urgent underage reports
    const { count: urgentUnderage } = await admin
      .from('reports')
      .select('*', { count: 'exact', head: true })
      .in('reason', ['appears under 18', 'underage'])
      .in('status', ['pending', 'reviewing']);

    return NextResponse.json({
      total_users: totalUsers ?? 0,
      active_users_today: activeToday ?? 0,
      open_reports: openReports ?? 0,
      bans_this_week: bansThisWeek ?? 0,
      urgent_underage: urgentUnderage ?? 0,
    });
  } catch (err: any) {
    console.error('GET /api/admin/stats error:', err);
    return NextResponse.json({ error: 'Failed to fetch admin stats' }, { status: 500 });
  }
}
