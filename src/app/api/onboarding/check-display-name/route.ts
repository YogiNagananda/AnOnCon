import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get('name');
  if (!name || name.length < 3) {
    return NextResponse.json({ available: false, error: 'Name too short' });
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('display_name', name)
    .maybeSingle();

  return NextResponse.json({ available: !data });
}
