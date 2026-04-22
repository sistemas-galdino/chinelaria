import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { setConversationPaused } from '@/lib/db/conversations';

export const runtime = 'nodejs';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    paused?: boolean;
    reason?: 'media' | 'intent_buy' | 'manual' | 'tool_signal';
  };
  if (typeof body.paused !== 'boolean') {
    return NextResponse.json({ error: 'paused (boolean) is required' }, { status: 400 });
  }
  await setConversationPaused(id, body.paused, body.reason ?? 'manual');
  return NextResponse.json({ ok: true });
}
