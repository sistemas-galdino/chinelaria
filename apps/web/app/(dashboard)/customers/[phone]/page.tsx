import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

async function saveAction(formData: FormData) {
  'use server';
  const phone = String(formData.get('phone'));
  const supabase = await getSupabaseServerClient();
  const display_name = String(formData.get('display_name') ?? '').trim() || null;
  const size_pref = String(formData.get('size_pref') ?? '').trim() || null;
  const brands = String(formData.get('brand_prefs') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const notes = String(formData.get('notes') ?? '').trim() || null;

  await supabase
    .from('customer_profiles')
    .update({ display_name, size_pref, brand_prefs: brands, notes })
    .eq('phone_number', phone);
  revalidatePath('/customers');
  redirect('/customers');
}

export default async function CustomerEditPage({ params }: { params: Promise<{ phone: string }> }) {
  const { phone } = await params;
  const decoded = decodeURIComponent(phone);
  const supabase = await getSupabaseServerClient();
  const { data: customer } = await supabase
    .from('customer_profiles')
    .select('*')
    .eq('phone_number', decoded)
    .single();
  if (!customer) notFound();

  return (
    <div style={{ padding: 20, maxWidth: 600 }}>
      <h1 style={{ marginTop: 0 }}>Editar cliente</h1>
      <p style={{ color: '#888' }}>{customer.phone_number}</p>
      <form action={saveAction} style={{ display: 'grid', gap: 12, background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #eee' }}>
        <input type="hidden" name="phone" value={customer.phone_number} />
        <Field label="Nome" name="display_name" defaultValue={customer.display_name ?? ''} />
        <Field label="Tamanho preferido" name="size_pref" defaultValue={customer.size_pref ?? ''} />
        <Field label="Marcas (separadas por vírgula)" name="brand_prefs" defaultValue={(customer.brand_prefs ?? []).join(', ')} />
        <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
          Anotações
          <textarea
            name="notes"
            defaultValue={customer.notes ?? ''}
            rows={6}
            style={{ padding: 10, borderRadius: 6, border: '1px solid #ddd', fontSize: 14, resize: 'vertical' }}
          />
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

function Field({ label, name, defaultValue }: { label: string; name: string; defaultValue: string }) {
  return (
    <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
      {label}
      <input
        name={name}
        defaultValue={defaultValue}
        style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #ddd', fontSize: 14 }}
      />
    </label>
  );
}
