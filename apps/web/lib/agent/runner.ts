import 'server-only';
import { HumanMessage, SystemMessage, type AIMessage } from '@langchain/core/messages';
import { buildAgent, buildSystemPrompt, detectHandoff } from '@chinelaria/agent';
import { sendText } from '../evolution/client.ts';
import { recordOutboundMessage, setConversationPaused } from '../db/conversations.ts';
import {
  loadActivePrompt,
  loadAgentConfig,
  loadConversationContext,
  profileToSummary,
} from './load-context.ts';
import { maybeUpdateProfile } from './update-profile.ts';

/**
 * Executa um turno completo do agente para uma conversa:
 *   1. Verifica config global (`agent_enabled`).
 *   2. Carrega conversa, perfil, últimas mensagens.
 *   3. Aborta se `agent_paused`.
 *   4. Compõe system prompt + perfil.
 *   5. Invoca o grafo LangGraph (com checkpointer, thread_id = conversation.thread_id).
 *   6. Pega o último AIMessage como resposta.
 *   7. Envia via Evolution + grava em messages.
 *   8. Detecta handoff (regex) e pausa se sinalizado.
 *   9. Dispara update-profile em background.
 */
export async function runAgentTurn(conversationId: string): Promise<void> {
  const config = await loadAgentConfig();
  if (config.agent_enabled === false) {
    console.log(`[agent] globally disabled — skipping ${conversationId}`);
    return;
  }

  const { conversation, profile, recentMessages } = await loadConversationContext(conversationId);

  if (conversation.agent_paused) {
    console.log(`[agent] conversation ${conversationId} paused — skipping`);
    return;
  }

  const lastCustomerMessage = recentMessages.findLast((m) => m.role === 'customer');
  if (!lastCustomerMessage) {
    console.log(`[agent] no customer message in ${conversationId} — skipping`);
    return;
  }

  const masterPrompt = await loadActivePrompt();
  const systemPrompt = buildSystemPrompt(masterPrompt, profileToSummary(profile));

  const agent = await buildAgent({
    model: typeof config.model === 'string' ? config.model : undefined,
    temperature: typeof config.temperature === 'number' ? config.temperature : undefined,
    maxTokens: typeof config.max_tokens === 'number' ? config.max_tokens : undefined,
  });

  const result = await agent.invoke(
    {
      messages: [
        new SystemMessage(systemPrompt),
        new HumanMessage(lastCustomerMessage.content ?? '[mensagem vazia]'),
      ],
    },
    {
      configurable: { thread_id: conversation.thread_id },
      recursionLimit: 25,
    },
  );

  const finalMessage = (result.messages as Array<AIMessage | unknown>)
    .reverse()
    .find((m): m is AIMessage => {
      const message = m as { _getType?: () => string; getType?: () => string };
      const type = message._getType?.() ?? message.getType?.();
      return type === 'ai';
    });

  if (!finalMessage) {
    console.error(`[agent] no AI message in result for ${conversationId}`);
    return;
  }

  const text =
    typeof finalMessage.content === 'string'
      ? finalMessage.content
      : (finalMessage.content as unknown[])
          .map((part) => {
            if (typeof part === 'string') return part;
            if (part && typeof part === 'object' && 'text' in part && typeof (part as { text: unknown }).text === 'string') {
              return (part as { text: string }).text;
            }
            return '';
          })
          .join('');

  if (!text.trim()) {
    console.warn(`[agent] empty response for ${conversationId}`);
    return;
  }

  await sendText(profile.phone_number, text);
  await recordOutboundMessage({
    conversationId,
    role: 'agent',
    content: text,
    metadata: { thread_id: conversation.thread_id },
  });

  const handoff = detectHandoff(text);
  if (handoff.handoff && handoff.reason) {
    await setConversationPaused(conversationId, true, handoff.reason);
  }

  // background fire-and-forget
  void maybeUpdateProfile({
    profile,
    customerText: lastCustomerMessage.content ?? '',
    agentText: text,
  });
}
