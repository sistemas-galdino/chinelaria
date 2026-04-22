import 'server-only';
import type { CustomerProfileSummary } from '@chinelaria/agent';
import type { Conversation, CustomerProfile, Message } from '@chinelaria/db';
import { getSupabaseAdminClient } from '../supabase/server.ts';

/** Carrega o system prompt ativo da tabela agent_prompts. */
export async function loadActivePrompt(): Promise<string> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from('agent_prompts')
    .select('content')
    .eq('is_active', true)
    .maybeSingle();
  if (error) throw new Error(`Failed to load active prompt: ${error.message}`);
  if (!data) throw new Error('No active prompt found in agent_prompts');
  return data.content;
}

/** Carrega config livre do agente (model, temperature, etc) como mapa key→value. */
export async function loadAgentConfig(): Promise<Record<string, unknown>> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.from('agent_config').select('key, value');
  if (error) throw new Error(`Failed to load agent_config: ${error.message}`);
  return Object.fromEntries((data ?? []).map((row) => [row.key, row.value]));
}

export function profileToSummary(profile: CustomerProfile): CustomerProfileSummary {
  return {
    phoneNumber: profile.phone_number,
    displayName: profile.display_name,
    sizePref: profile.size_pref,
    brandPrefs: profile.brand_prefs ?? [],
    notes: profile.notes,
  };
}

/**
 * Carrega conversa, perfil e últimas N mensagens.
 * Usado para reconstruir contexto se o checkpoint LangGraph estiver vazio.
 */
export async function loadConversationContext(conversationId: string): Promise<{
  conversation: Conversation;
  profile: CustomerProfile;
  recentMessages: Message[];
}> {
  const supabase = getSupabaseAdminClient();

  const { data: conversation, error: convErr } = await supabase
    .from('conversations')
    .select()
    .eq('id', conversationId)
    .single();
  if (convErr || !conversation) {
    throw new Error(`Conversation ${conversationId} not found: ${convErr?.message}`);
  }

  const { data: profile, error: profErr } = await supabase
    .from('customer_profiles')
    .select()
    .eq('phone_number', conversation.phone_number)
    .single();
  if (profErr || !profile) {
    throw new Error(`Profile ${conversation.phone_number} not found: ${profErr?.message}`);
  }

  const { data: recentMessages } = await supabase
    .from('messages')
    .select()
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(20);

  return {
    conversation,
    profile,
    recentMessages: (recentMessages ?? []).reverse(),
  };
}
