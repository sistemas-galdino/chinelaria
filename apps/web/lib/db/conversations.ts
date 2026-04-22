import 'server-only';
import { randomUUID } from 'node:crypto';
import type { Conversation, CustomerProfile, Json, Message } from '@chinelaria/db';
import type { NormalizedInboundMessage } from '@chinelaria/shared';
import { getSupabaseAdminClient } from '../supabase/server.ts';

/**
 * Garante que existe customer_profile + conversation para o phone_number,
 * insere a mensagem (role=customer), atualiza last_message_* e unread_count.
 *
 * Retorna { conversation, isNew, message } — usado pelo webhook para
 * decidir se dispara o agente ou se pula (paused).
 */
export async function ingestInboundMessage(input: NormalizedInboundMessage): Promise<{
  conversation: Conversation;
  customer: CustomerProfile;
  message: Message;
  isNew: boolean;
}> {
  const supabase = getSupabaseAdminClient();

  // 1. upsert customer_profile (cria se não existe; atualiza display_name e last_seen_at)
  const { data: customer, error: customerErr } = await supabase
    .from('customer_profiles')
    .upsert(
      {
        phone_number: input.phoneNumber,
        ...(input.pushName ? { display_name: input.pushName } : {}),
        last_seen_at: new Date(input.timestamp * 1000).toISOString(),
      },
      { onConflict: 'phone_number' },
    )
    .select()
    .single();
  if (customerErr || !customer) {
    throw new Error(`Failed to upsert customer_profile: ${customerErr?.message}`);
  }

  // 2. busca a conversation existente (única por phone_number)
  const { data: existingConv } = await supabase
    .from('conversations')
    .select()
    .eq('phone_number', input.phoneNumber)
    .maybeSingle();

  let conversation: Conversation;
  let isNew = false;

  if (existingConv) {
    conversation = existingConv;
  } else {
    const threadId = randomUUID();
    const { data: created, error: convErr } = await supabase
      .from('conversations')
      .insert({
        phone_number: input.phoneNumber,
        thread_id: threadId,
        last_message_at: new Date(input.timestamp * 1000).toISOString(),
        last_message_role: 'customer',
        unread_count: 1,
      })
      .select()
      .single();
    if (convErr || !created) {
      throw new Error(`Failed to create conversation: ${convErr?.message}`);
    }
    conversation = created;
    isNew = true;
  }

  // 3. insere a mensagem
  const messageRow: import('@chinelaria/db').Database['public']['Tables']['messages']['Insert'] = {
    conversation_id: conversation.id,
    role: 'customer',
    content: input.text,
    media_url: input.mediaUrl,
    media_type: input.mediaType,
    media_mimetype: input.mediaMimetype,
    metadata: {
      evolution_message_id: input.evolutionMessageId,
      timestamp: input.timestamp,
    },
  };
  const { data: message, error: msgErr } = await supabase
    .from('messages')
    .insert(messageRow)
    .select()
    .single();
  if (msgErr || !message) {
    throw new Error(`Failed to insert message: ${msgErr?.message}`);
  }

  // 4. atualiza conversation last_message_*
  if (!isNew) {
    await supabase
      .from('conversations')
      .update({
        last_message_at: new Date(input.timestamp * 1000).toISOString(),
        last_message_role: 'customer',
        unread_count: conversation.unread_count + 1,
      })
      .eq('id', conversation.id);
  }

  return { conversation, customer, message, isNew };
}

/**
 * Insere uma resposta enviada (agente ou humano). Usado pelo agente
 * ao responder ou pelo dashboard ao enviar como humano.
 */
export async function recordOutboundMessage(params: {
  conversationId: string;
  role: 'agent' | 'human';
  content: string;
  metadata?: Json;
}): Promise<Message> {
  const supabase = getSupabaseAdminClient();
  const { data: message, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: params.conversationId,
      role: params.role,
      content: params.content,
      metadata: params.metadata ?? {},
    })
    .select()
    .single();
  if (error || !message) {
    throw new Error(`Failed to insert outbound message: ${error?.message}`);
  }
  await supabase
    .from('conversations')
    .update({
      last_message_at: new Date().toISOString(),
      last_message_role: params.role,
      unread_count: 0,
    })
    .eq('id', params.conversationId);
  return message;
}

/** Pausa ou reativa o agente em uma conversa. */
export async function setConversationPaused(
  conversationId: string,
  paused: boolean,
  reason?: 'media' | 'intent_buy' | 'manual' | 'tool_signal',
): Promise<void> {
  const supabase = getSupabaseAdminClient();
  await supabase
    .from('conversations')
    .update({
      agent_paused: paused,
      paused_reason: paused ? (reason ?? 'manual') : null,
      paused_at: paused ? new Date().toISOString() : null,
    })
    .eq('id', conversationId);
}
