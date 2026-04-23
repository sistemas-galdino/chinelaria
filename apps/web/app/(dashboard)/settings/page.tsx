import { revalidatePath } from 'next/cache';
import { getSupabaseServerClient } from '@/lib/supabase/server';

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

  return (
    <div style={{ padding: 20, maxWidth: 600 }}>
      <h1 style={{ margin: '0 0 16px' }}>Configurações do agente</h1>
      <form action={saveSettingsAction} style={{ display: 'grid', gap: 14, background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #eee' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
          <input type="checkbox" name="agent_enabled" defaultChecked={cfg.agent_enabled !== false} />
          <span>
            <strong>Agente ativo globalmente</strong>
            <div style={{ fontSize: 12, color: '#666' }}>
              Quando desligado, o agente não responde a nenhuma conversa nova.
            </div>
          </span>
        </label>

        <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
          Modelo
          <select
            name="model"
            defaultValue={typeof cfg.model === 'string' ? cfg.model : 'gpt-5'}
            style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #ddd', fontSize: 14 }}
          >
            <option value="gpt-5">gpt-5</option>
            <option value="gpt-5-mini">gpt-5-mini</option>
            <option value="gpt-4o">gpt-4o</option>
            <option value="gpt-4o-mini">gpt-4o-mini</option>
          </select>
        </label>

        <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
          Temperature
          <input
            name="temperature"
            type="number"
            step="0.1"
            min="0"
            max="2"
            defaultValue={typeof cfg.temperature === 'number' ? cfg.temperature : 0.7}
            style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #ddd', fontSize: 14 }}
          />
        </label>

        <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
          Max tokens
          <input
            name="max_tokens"
            type="number"
            min="100"
            max="8000"
            defaultValue={typeof cfg.max_tokens === 'number' ? cfg.max_tokens : 2000}
            style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #ddd', fontSize: 14 }}
          />
        </label>

        <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
          Números permitidos (allowlist)
          <input
            name="allowed_phones"
            placeholder="ex: 5511921239343, 5511988887777"
            defaultValue={Array.isArray(cfg.allowed_phones) ? (cfg.allowed_phones as string[]).join(', ') : ''}
            style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #ddd', fontSize: 14 }}
          />
          <span style={{ fontSize: 12, color: '#666' }}>
            Vazio = agente responde a todos. Com valores = só responde aos números listados (E.164 sem +, separados por vírgula). Ideal para testes.
          </span>
        </label>

        <button
          type="submit"
          style={{
            padding: '10px 14px',
            borderRadius: 6,
            border: 'none',
            background: '#111',
            color: '#fff',
            fontSize: 14,
            cursor: 'pointer',
            justifySelf: 'start',
          }}
        >
          Salvar
        </button>
      </form>
    </div>
  );
}
