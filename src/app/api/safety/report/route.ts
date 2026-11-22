import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const VALID_REASONS = [
  'harassment',
  'sexual content',
  'scam/spam',
  'appears under 18',
  'other',
];

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { reported_id, reason, details } = body;

    if (!reported_id) {
      return NextResponse.json({ error: 'Reported user ID is required' }, { status: 400 });
    }
    if (reported_id === user.id) {
      return NextResponse.json({ error: 'Cannot report yourself' }, { status: 400 });
    }

    if (!reason || !VALID_REASONS.includes(reason.toLowerCase())) {
      return NextResponse.json({
        error: `Invalid reason. Must be one of: ${VALID_REASONS.join(', ')}`,
      }, { status: 400 });
    }

    const { data: report, error: insertError } = await supabase
      .from('reports')
      .insert({
        reporter_id: user.id,
        reported_id,
        reason: reason.toLowerCase(),
        description: details ? details.slice(0, 1000) : null,
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
