import { NextResponse, type NextRequest } from 'next/server';
import { runAgentTurn } from '@/lib/agent/runner';
import { ingestInboundMessage, setConversationPaused, recordOutboundMessage } from '@/lib/db/conversations';
import { normalize } from '@/lib/evolution/normalize';
import { sendText } from '@/lib/evolution/client';
import type { EvolutionWebhookPayload } from '@/lib/evolution/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Webhook do Evolution API. Configurar em:
 *   POST {EVOLUTION_BASE_URL}/webhook/set/{instance}
 *   {
 *     "url": "https://SEU-DOMINIO/api/webhook/evolution",
 *     "events": ["MESSAGES_UPSERT"],
 *     "headers": { "Authorization": "Bearer ${EVOLUTION_WEBHOOK_SECRET}" }
 *   }
 *
 * Comportamento:
 *   1. Valida header Authorization Bearer.
 *   2. Normaliza payload, filtra grupos/fromMe.
 *   3. Persiste customer_profile, conversation, message.
 *   4. Se conversa pausada → para aqui.
 *   5. Se for video/document → pausa + manda mensagem padrão.
 *   6. Senão → dispara `/api/agent/run` async (Fase 4).
 *   7. Retorna 200 sempre que possível para não causar retries do Evolution.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const expectedSecret = process.env.EVOLUTION_WEBHOOK_SECRET;
  if (expectedSecret) {
    const auth = req.headers.get('authorization') ?? '';
    if (auth !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }

  let payload: EvolutionWebhookPayload;
  try {
    payload = (await req.json()) as EvolutionWebhookPayload;
  } catch {
    return NextResponse.json({ ok: true, ignored: 'invalid_json' });
  }

  const inbound = normalize(payload);
  if (!inbound) {
    return NextResponse.json({ ok: true, ignored: payload.event ?? 'unknown' });
  }

  let conversation;
  try {
    const ingested = await ingestInboundMessage(inbound);
    conversation = ingested.conversation;
  } catch (err) {
    console.error('webhook ingest error', err);
    // 200 para não disparar retry — falha de DB transient é problema nosso
    return NextResponse.json({ ok: false, error: 'ingest_failed' });
  }

  if (conversation.agent_paused) {
    return NextResponse.json({ ok: true, paused: true });
  }

  // Vídeo / documento → pausa imediata + mensagem padrão (V1 simples).
  if (inbound.mediaType === 'video') {
    try {
      await setConversationPaused(conversation.id, true, 'media');
      const text =
        'Recebi seu vídeo aqui! Vou pedir para a Leilane dar uma olhadinha e já te respondo, tá? 😊';
      await sendText(inbound.phoneNumber, text);
      await recordOutboundMessage({
        conversationId: conversation.id,
        role: 'agent',
        content: text,
        metadata: { auto_handoff: 'video' },
      });
    } catch (err) {
      console.error('handoff video error', err);
    }
    return NextResponse.json({ ok: true, handoff: 'video' });
  }

  // Dispara o agente in-process — fire-and-forget no mesmo Node runtime.
  // Evita HTTP loopback (que era bloqueado pelo proxy do EasyPanel).
  console.log(`[webhook] dispatching agent for conversation ${conversation.id}`);
  void runAgentTurn(conversation.id).catch((err) =>
    console.error(`[webhook] agent run failed for ${conversation.id}`, err),
  );

  return NextResponse.json({ ok: true, conversationId: conversation.id });
}
