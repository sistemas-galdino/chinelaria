import { revalidatePath } from 'next/cache';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import PromptEditor from './_components/prompt-editor';

export const dynamic = 'force-dynamic';

async function saveNewPromptAction(formData: FormData) {
  'use server';
  const content = String(formData.get('content') ?? '').trim();
  const label = String(formData.get('label') ?? '').trim() || null;
  if (!content) return;
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  // desativa o ativo anterior, insere novo já ativo
  await supabase.from('agent_prompts').update({ is_active: false }).eq('is_active', true);
  await supabase.from('agent_prompts').insert({
    content,
    label,
    is_active: true,
    created_by: user?.id ?? null,
  });
  revalidatePath('/prompt');
}

async function activatePromptAction(formData: FormData) {
  'use server';
  const id = Number(formData.get('id'));
  if (!id) return;
  const supabase = await getSupabaseServerClient();
  await supabase.from('agent_prompts').update({ is_active: false }).eq('is_active', true);
  await supabase.from('agent_prompts').update({ is_active: true }).eq('id', id);
  revalidatePath('/prompt');
}

export default async function PromptPage() {
  const supabase = await getSupabaseServerClient();
  const { data: prompts } = await supabase
    .from('agent_prompts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  const active = prompts?.find((p) => p.is_active) ?? null;
  const versions = prompts ?? [];

  return (
    <div style={{ padding: 20, display: 'grid', gap: 20 }}>
      <h1 style={{ margin: 0 }}>System prompt</h1>

      <PromptEditor active={active} saveAction={saveNewPromptAction} />

      <section>
        <h2 style={{ fontSize: 16, marginBottom: 8 }}>Versões anteriores</h2>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 6 }}>
          {versions.map((v) => (
            <li
              key={v.id}
              style={{
                background: '#fff',
                border: '1px solid #eee',
                borderRadius: 8,
                padding: 10,
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: 8,
                alignItems: 'center',
              }}
            >
              <div>
                <strong style={{ fontSize: 14 }}>
                  v{v.id}
                  {v.is_active ? ' · ATIVO' : ''}
                </strong>
                {v.label ? <span style={{ color: '#666', marginLeft: 8 }}>{v.label}</span> : null}
                <div style={{ color: '#888', fontSize: 12, marginTop: 2 }}>
                  {new Date(v.created_at).toLocaleString('pt-BR')} · {v.content.length} chars
                </div>
              </div>
              {!v.is_active ? (
                <form action={activatePromptAction}>
                  <input type="hidden" name="id" value={v.id} />
                  <button
                    type="submit"
                    style={{
                      padding: '6px 10px',
                      borderRadius: 6,
                      border: '1px solid #ddd',
                      background: '#fff',
                      cursor: 'pointer',
                      fontSize: 13,
                    }}
                  >
                    Ativar
                  </button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
