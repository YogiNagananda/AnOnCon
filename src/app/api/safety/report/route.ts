import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/security/rateLimit';
import { sanitizeInput } from '@/lib/security/sanitize';

const VALID_REASONS = [
  'harassment',
  'sexual content',
  'scam/spam',
  'appears under 18',
  'underage',
  'inappropriate',
  'other',
];

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Rate limiting: max 10 reports / hour
    const limitCheck = checkRateLimit(user.id, 'reports');
    if (!limitCheck.success) {
      return NextResponse.json(
        { error: `Too many reports submitted. Please wait ${limitCheck.resetSeconds}s before submitting again.` },
        { status: 429, headers: { 'Retry-After': String(limitCheck.resetSeconds) } }
      );
    }

    const body = await request.json();
    const { reported_id, reason, details, report_type, target_message_id, target_group_id } = body;

    if (!reported_id) {
      return NextResponse.json({ error: 'Reported user ID is required' }, { status: 400 });
    }
    if (reported_id === user.id) {
      return NextResponse.json({ error: 'Cannot report yourself' }, { status: 400 });
    }

    const lowerReason = reason?.toLowerCase()?.trim();
    if (!lowerReason || !VALID_REASONS.includes(lowerReason)) {
      return NextResponse.json({
        error: `Invalid reason. Must be one of: ${VALID_REASONS.join(', ')}`,
      }, { status: 400 });
    }

    const cleanDetails = details ? sanitizeInput(details, 1000) : null;
    const cleanType = ['user', 'message', 'group'].includes(report_type) ? report_type : 'user';

    const { data: report, error: insertError } = await supabase
      .from('reports')
      .insert({
        reporter_id: user.id,
        reported_id,
        reason: lowerReason,
        description: cleanDetails,
        report_type: cleanType,
        target_message_id: target_message_id || null,
        target_group_id: target_group_id || null,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Report submission error:', insertError);
      return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 });
    }

    return NextResponse.json({ success: true, report });
  } catch (err) {
    console.error('Report handler error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
