import 'server-only';
import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';
import type { CustomerProfile } from '@chinelaria/db';
import { getSupabaseAdminClient } from '../supabase/server.ts';

/**
 * Pós-processamento: pede ao LLM para extrair fatos novos do turn
 * (tamanho, marca preferida, nome) e faz merge no customer_profile.
 *
 * Roda em background, não bloqueia a resposta. Falha silenciosa.
 */

const profileExtractionSchema = z.object({
  display_name: z.string().nullish().describe('Nome do cliente, se mencionado'),
  size_pref: z.string().nullish().describe('Tamanho/numero de calçado, ex: "37" ou "35/36"'),
  brand_prefs: z.array(z.string()).nullish().describe('Marcas que o cliente demonstrou interesse'),
  note: z.string().nullish().describe('Anotação curta sobre algo relevante deste turn (max 100 chars)'),
});

export async function maybeUpdateProfile(params: {
  profile: CustomerProfile;
  customerText: string;
  agentText: string;
}): Promise<void> {
  if (!process.env.OPENAI_API_KEY) return;

  try {
    const llm = new ChatOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL ?? 'gpt-5',
      temperature: 0,
    }).withStructuredOutput(profileExtractionSchema);

    const result = await llm.invoke([
      {
        role: 'system',
        content:
          'Extraia fatos sobre o cliente do turno de conversa abaixo. Devolva apenas o que for explicitamente mencionado pelo cliente. Se nada novo, devolva tudo nulo.',
      },
      {
        role: 'user',
        content: `Perfil atual:\n${JSON.stringify(
          {
            display_name: params.profile.display_name,
            size_pref: params.profile.size_pref,
            brand_prefs: params.profile.brand_prefs ?? [],
          },
          null,
          2,
        )}\n\nCliente: ${params.customerText}\nAgente: ${params.agentText}`,
      },
    ]);

    const supabase = getSupabaseAdminClient();
    const updates: Partial<CustomerProfile> = {};

    if (result.display_name && !params.profile.display_name) {
      updates.display_name = result.display_name;
    }
    if (result.size_pref) {
      updates.size_pref = result.size_pref;
    }
    if (result.brand_prefs && result.brand_prefs.length > 0) {
      const merged = Array.from(
        new Set([...(params.profile.brand_prefs ?? []), ...result.brand_prefs]),
      );
      updates.brand_prefs = merged;
    }
    if (result.note) {
      const existing = params.profile.notes ?? '';
      updates.notes = existing
        ? `${existing}\n[${new Date().toISOString().slice(0, 10)}] ${result.note}`
        : `[${new Date().toISOString().slice(0, 10)}] ${result.note}`;
    }

    if (Object.keys(updates).length === 0) return;

    await supabase
      .from('customer_profiles')
      .update(updates)
      .eq('phone_number', params.profile.phone_number);
  } catch (err) {
    console.error('maybeUpdateProfile error', err);
  }
}
