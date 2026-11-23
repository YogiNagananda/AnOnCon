import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth/admin';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { adminUser, errorResponse } = await verifyAdmin();
  if (errorResponse) return errorResponse;
  if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const admin = await createAdminClient();
    const { searchParams } = request.nextUrl;

    const statusParam = searchParams.get('status');
    const reasonParam = searchParams.get('reason');
    const typeParam = searchParams.get('type');
    const priorityParam = searchParams.get('priority');

    let query = admin
      .from('reports')
      .select('*')
      .order('priority', { ascending: false }) // urgent first
      .order('created_at', { ascending: false });

    if (statusParam && statusParam !== 'all') {
      query = query.eq('status', statusParam as any);
    } else if (!statusParam) {
      query = query.in('status', ['pending', 'reviewing']);
    }

    if (reasonParam && reasonParam !== 'all') {
      query = query.eq('reason', reasonParam);
    }

    if (typeParam && typeParam !== 'all') {
      query = query.eq('report_type', typeParam as any);
    }

    if (priorityParam && priorityParam !== 'all') {
      query = query.eq('priority', priorityParam as any);
    }

    const { data: reports, error } = await query.limit(100);
    if (error) throw error;

    if (!reports || reports.length === 0) {
      return NextResponse.json({ reports: [] });
    }

    // Collect user IDs for batch profile resolution
    const reporterIds = reports.map(r => r.reporter_id).filter(Boolean);
    const reportedIds = reports.map(r => r.reported_id).filter(Boolean);
    const allUserIds = [...new Set([...reporterIds, ...reportedIds])];

    const messageIds = reports.map(r => r.target_message_id).filter(Boolean) as string[];
    const groupIds = reports.map(r => r.target_group_id).filter(Boolean) as string[];

    // Parallel lookups
    const [profilesRes, messagesRes, groupsRes, actionsRes] = await Promise.all([
      admin
        .from('profiles')
        .select('id, display_name, avatar_url, is_suspended, suspended_until, is_banned, role, created_at')
        .in('id', allUserIds),
      messageIds.length > 0
        ? admin.from('messages').select('id, content, created_at, is_deleted').in('id', messageIds)
        : Promise.resolve({ data: [] }),
      groupIds.length > 0
        ? admin.from('groups').select('id, name').in('id', groupIds)
        : Promise.resolve({ data: [] }),
      admin
        .from('moderation_actions')
        .select('target_id, action, created_at')
        .in('target_id', reportedIds),
    ]);

    const profileMap = new Map((profilesRes.data ?? []).map(p => [p.id, p]));
    const messageMap = new Map((messagesRes.data ?? []).map(m => [m.id, m]));
    const groupMap = new Map((groupsRes.data ?? []).map(g => [g.id, g]));

    // Count past moderation actions per target
    const actionCountMap = new Map<string, number>();
    (actionsRes.data ?? []).forEach(a => {
      actionCountMap.set(a.target_id, (actionCountMap.get(a.target_id) || 0) + 1);
    });

    const enriched = reports.map(r => ({
      ...r,
      reporter: profileMap.get(r.reporter_id) ?? null,
      reported: profileMap.get(r.reported_id) ?? null,
      target_message: r.target_message_id ? messageMap.get(r.target_message_id) ?? null : null,
      target_group: r.target_group_id ? groupMap.get(r.target_group_id) ?? null : null,
      reported_past_actions_count: actionCountMap.get(r.reported_id) || 0,
    }));

    return NextResponse.json({ reports: enriched });
  } catch (err: any) {
    console.error('GET /api/admin/reports error:', err);
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
  }
}
