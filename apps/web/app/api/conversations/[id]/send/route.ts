import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { recordOutboundMessage, setConversationPaused } from '@/lib/db/conversations';
import { sendText } from '@/lib/evolution/client';

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
  const body = (await req.json().catch(() => ({}))) as { text?: string };
  const text = (body.text ?? '').trim();
  if (!text) return NextResponse.json({ error: 'text is required' }, { status: 400 });

  const { data: conversation, error } = await supabase
    .from('conversations')
    .select('phone_number, agent_paused')
    .eq('id', id)
    .single();
  if (error || !conversation) {
    return NextResponse.json({ error: 'conversation not found' }, { status: 404 });
  }

  await sendText(conversation.phone_number, text);

  // Sempre pausa o agente quando humano envia (segurança contra concorrência)
  if (!conversation.agent_paused) {
    await setConversationPaused(id, true, 'manual');
  }

  await recordOutboundMessage({
    conversationId: id,
    role: 'human',
    content: text,
    metadata: { sent_by: user.email ?? user.id },
  });

  return NextResponse.json({ ok: true });
}
