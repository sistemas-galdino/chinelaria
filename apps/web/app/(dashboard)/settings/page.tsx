import { revalidatePath } from 'next/cache';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { WhatsAppConnection } from './_components/whatsapp-connection';

export const dynamic = 'force-dynamic';

async function saveSettingsAction(formData: FormData) {
  'use server';
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const allowedPhones = String(formData.get('allowed_phones') ?? '')
    .split(',')
    .map((s) => s.replace(/\D/g, ''))
    .filter((s) => s.length > 0);

  const updates: Array<{ key: string; value: unknown }> = [
    { key: 'agent_enabled', value: formData.get('agent_enabled') === 'on' },
    { key: 'model', value: String(formData.get('model') ?? 'gpt-5') },
    { key: 'temperature', value: Number(formData.get('temperature') ?? 1) },
    { key: 'max_tokens', value: Number(formData.get('max_tokens') ?? 2000) },
    { key: 'allowed_phones', value: allowedPhones },
  ];

  for (const u of updates) {
    await supabase
      .from('agent_config')
      .upsert(
        { key: u.key, value: u.value as never, updated_by: user.id, updated_at: new Date().toISOString() },
        { onConflict: 'key' },
      );
  }
  revalidatePath('/settings');
}

export default async function SettingsPage() {
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase.from('agent_config').select('key, value');
  const cfg = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
  const instanceName = process.env.EVOLUTION_INSTANCE ?? 'chinelaria';

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-6 sm:py-10 flex flex-col gap-8">
      <header>
        <h1 className="font-serif text-[28px] sm:text-[32px] text-ink leading-tight">
          Configurações
        </h1>
        <p className="text-[13px] text-ink-muted mt-1">
          Conexão do WhatsApp e comportamento do agente.
        </p>
      </header>

      <WhatsAppConnection instanceName={instanceName} />

      <form
        action={saveSettingsAction}
        className="rounded-card border border-sand-200 bg-paper-soft shadow-soft p-5 sm:p-6 flex flex-col gap-5"
      >
        <h2 className="font-serif text-[20px] sm:text-[22px] text-ink leading-tight">
          Comportamento do agente
        </h2>

        <label className="flex items-start gap-3 text-[13px] cursor-pointer">
          <input
            type="checkbox"
            name="agent_enabled"
            defaultChecked={cfg.agent_enabled !== false}
            className="mt-0.5 size-4 rounded border-sand-300 text-terracotta-500 focus:ring-terracotta-500/40 cursor-pointer"
          />
          <span>
            <span className="block font-medium text-ink">Agente ativo globalmente</span>
            <span className="block text-[12px] text-ink-muted mt-0.5 leading-relaxed">
              Quando desligado, o agente não responde a nenhuma conversa nova.
            </span>
          </span>
        </label>

        <label className="flex flex-col gap-1.5 text-[13px]">
          <span className="font-medium text-ink">Modelo</span>
          <select
            name="model"
            defaultValue={typeof cfg.model === 'string' ? cfg.model : 'gpt-5'}
            className="rounded-lg border border-sand-300 bg-paper px-3 py-2 text-[14px] text-ink focus:outline-none focus:border-terracotta-500/60 focus:ring-2 focus:ring-terracotta-500/15 transition-colors"
          >
            <option value="gpt-5">gpt-5</option>
            <option value="gpt-5-mini">gpt-5-mini</option>
            <option value="gpt-4o">gpt-4o</option>
            <option value="gpt-4o-mini">gpt-4o-mini</option>
          </select>
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5 text-[13px]">
            <span className="font-medium text-ink">Temperature</span>
            <input
              name="temperature"
              type="number"
              step="0.1"
              min="0"
              max="2"
              defaultValue={typeof cfg.temperature === 'number' ? cfg.temperature : 0.7}
              className="rounded-lg border border-sand-300 bg-paper px-3 py-2 text-[14px] text-ink focus:outline-none focus:border-terracotta-500/60 focus:ring-2 focus:ring-terracotta-500/15 transition-colors"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-[13px]">
            <span className="font-medium text-ink">Max tokens</span>
            <input
              name="max_tokens"
              type="number"
              min="100"
              max="8000"
              defaultValue={typeof cfg.max_tokens === 'number' ? cfg.max_tokens : 2000}
              className="rounded-lg border border-sand-300 bg-paper px-3 py-2 text-[14px] text-ink focus:outline-none focus:border-terracotta-500/60 focus:ring-2 focus:ring-terracotta-500/15 transition-colors"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1.5 text-[13px]">
          <span className="font-medium text-ink">Números permitidos (allowlist)</span>
          <input
            name="allowed_phones"
            placeholder="ex: 5511921239343, 5511988887777"
            defaultValue={
              Array.isArray(cfg.allowed_phones)
                ? (cfg.allowed_phones as string[]).join(', ')
                : ''
            }
            className="rounded-lg border border-sand-300 bg-paper px-3 py-2 text-[14px] text-ink placeholder:text-ink-muted/60 focus:outline-none focus:border-terracotta-500/60 focus:ring-2 focus:ring-terracotta-500/15 transition-colors"
          />
          <span className="text-[12px] text-ink-muted leading-relaxed">
            Vazio = agente responde a todos. Com valores = só responde aos números listados (E.164
            sem +, separados por vírgula). Ideal para testes.
          </span>
        </label>

        <button
          type="submit"
          className="self-start rounded-full bg-ink text-paper px-5 py-2.5 text-[13px] font-medium tracking-wide hover:bg-ink-soft transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-terracotta-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-paper-soft"
        >
          Salvar
        </button>
      </form>
    </div>
  );
}
