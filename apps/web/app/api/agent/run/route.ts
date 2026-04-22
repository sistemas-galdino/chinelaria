import { NextResponse, type NextRequest } from 'next/server';
import { runAgentTurn } from '@/lib/agent/runner';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 90;

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = (await req.json().catch(() => ({}))) as { conversationId?: string };
  const conversationId = body.conversationId;
  if (!conversationId) {
    return NextResponse.json({ error: 'conversationId is required' }, { status: 400 });
  }
  try {
    await runAgentTurn(conversationId);
    return NextResponse.json({ ok: true, conversationId });
  } catch (err) {
    console.error(`[agent run] failed for ${conversationId}`, err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
