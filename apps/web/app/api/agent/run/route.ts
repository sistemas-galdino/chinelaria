import { NextResponse, type NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Stub temporário — Fase 4 substitui pelo grafo LangGraph completo.
 * Aceita { conversationId } no body e responde 202 sem fazer nada.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = (await req.json().catch(() => ({}))) as { conversationId?: string };
  const conversationId = body.conversationId;
  if (!conversationId) {
    return NextResponse.json({ error: 'conversationId is required' }, { status: 400 });
  }
  console.log(`[agent stub] would run for conversation ${conversationId}`);
  return NextResponse.json({ ok: true, stub: true, conversationId }, { status: 202 });
}
