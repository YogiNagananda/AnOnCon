import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth/admin';
import { createAdminClient } from '@/lib/supabase/server';
import crypto from 'crypto';

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const { adminUser, errorResponse } = await verifyAdmin();
  if (errorResponse) return errorResponse;
  if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id: reportId } = await params;
    const admin = await createAdminClient();

    const body = await request.json();
    const { action, reason, durationDays, notes } = body;

    if (!['dismiss', 'warn', 'suspend', 'ban'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be dismiss, warn, suspend, or ban.' },
        { status: 400 }
      );
    }

    if (!reason?.trim() && action !== 'dismiss') {
      return NextResponse.json({ error: 'A reason must be provided for moderation actions.' }, { status: 400 });
    }

    // Fetch the report
    const { data: report, error: repErr } = await admin
      .from('reports')
      .select('*')
      .eq('id', reportId)
      .single();

    if (repErr || !report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    const nowIso = new Date().toISOString();
    const targetUserId = report.reported_id;

    if (action === 'dismiss') {
      await admin
        .from('reports')
        .update({
          status: 'dismissed',
          admin_notes: notes || 'Dismissed by moderator.',
          resolved_by: adminUser.id,
          resolved_at: nowIso,
          updated_at: nowIso,
        })
        .eq('id', reportId);

      return NextResponse.json({ success: true, message: 'Report dismissed' });
    }

    if (action === 'warn') {
      // 1. Log moderation action
      await admin.from('moderation_actions').insert({
        admin_id: adminUser.id,
        target_id: targetUserId,
        report_id: reportId,
        action: 'warn',
        reason: reason.trim(),
      });

      // 2. Mark report resolved
      await admin
        .from('reports')
        .update({
          status: 'resolved',
          admin_notes: notes || `Warning issued: ${reason}`,
          resolved_by: adminUser.id,
          resolved_at: nowIso,
          updated_at: nowIso,
        })
        .eq('id', reportId);

      return NextResponse.json({ success: true, message: 'Warning issued and logged' });
    }

    if (action === 'suspend') {
      const days = Number(durationDays) || 7;
      const suspendUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

      // 1. Update user profile to suspended
      await admin
        .from('profiles')
        .update({
          is_suspended: true,
          suspended_until: suspendUntil,
          updated_at: nowIso,
        })
        .eq('id', targetUserId);

      // 2. Log moderation action
      await admin.from('moderation_actions').insert({
        admin_id: adminUser.id,
        target_id: targetUserId,
        report_id: reportId,
        action: 'suspend',
        reason: reason.trim(),
        duration: `${days} days`,
      });

      // 3. Mark report resolved
      await admin
        .from('reports')
        .update({
          status: 'resolved',
          admin_notes: notes || `Suspended for ${days} days: ${reason}`,
          resolved_by: adminUser.id,
          resolved_at: nowIso,
          updated_at: nowIso,
        })
        .eq('id', reportId);

      return NextResponse.json({ success: true, message: `User suspended for ${days} days` });
    }

    if (action === 'ban') {
      // 1. Update user profile to permanently banned and hidden
      await admin
        .from('profiles')
        .update({
          is_banned: true,
          is_visible: false,
          is_online: false,
          updated_at: nowIso,
        })
        .eq('id', targetUserId);

      // 2. Log moderation action
      await admin.from('moderation_actions').insert({
        admin_id: adminUser.id,
        target_id: targetUserId,
        report_id: reportId,
        action: 'ban',
        reason: reason.trim(),
      });

      // 3. Record device/IP identifier hash if available
      const forwarded = request.headers.get('x-forwarded-for');
      const ip = forwarded?.split(',')[0]?.trim() || 'unknown';
      const userAgent = request.headers.get('user-agent') || 'unknown';

      const ipHash = crypto.createHash('sha256').update(ip).digest('hex');
      const deviceHash = crypto.createHash('sha256').update(userAgent).digest('hex');

      await admin.from('banned_identifiers').insert({
        user_id: targetUserId,
        ip_hash: ipHash,
        device_hash: deviceHash,
        reason: reason.trim(),
        banned_by: adminUser.id,
      });

      // 4. Mark report resolved
      await admin
        .from('reports')
        .update({
          status: 'resolved',
          admin_notes: notes || `Permanently banned: ${reason}`,
          resolved_by: adminUser.id,
          resolved_at: nowIso,
          updated_at: nowIso,
        })
        .eq('id', reportId);

      return NextResponse.json({ success: true, message: 'User permanently banned' });
    }

    return NextResponse.json({ error: 'Unhandled action' }, { status: 400 });
  } catch (err: any) {
    console.error('POST /api/admin/reports/:id/action error:', err);
    return NextResponse.json({ error: 'Failed to process moderation action' }, { status: 500 });
  }
}
