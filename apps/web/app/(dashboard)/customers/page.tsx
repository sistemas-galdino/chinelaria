import Link from 'next/link';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function CustomersPage() {
  const supabase = await getSupabaseServerClient();
  const { data: customers } = await supabase
    .from('customer_profiles')
    .select('*')
    .order('last_seen_at', { ascending: false, nullsFirst: false })
    .limit(200);

  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ marginTop: 0 }}>Clientes</h1>
      <p style={{ color: '#666' }}>{customers?.length ?? 0} perfis. Última visita primeiro.</p>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 6 }}>
        {(customers ?? []).map((c) => (
          <li
            key={c.phone_number}
            style={{
              background: '#fff',
              border: '1px solid #eee',
              borderRadius: 8,
              padding: 12,
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              gap: 8,
            }}
          >
            <div>
              <strong>{c.display_name ?? c.phone_number}</strong>
              <span style={{ color: '#888', marginLeft: 8, fontSize: 13 }}>{c.phone_number}</span>
              <div style={{ fontSize: 13, color: '#555', marginTop: 4 }}>
                {c.size_pref ? <>Tamanho: <strong>{c.size_pref}</strong> · </> : null}
                {c.brand_prefs && c.brand_prefs.length > 0 ? <>Marcas: {c.brand_prefs.join(', ')} · </> : null}
                Última visita: {c.last_seen_at ? new Date(c.last_seen_at).toLocaleString('pt-BR') : '—'}
              </div>
              {c.notes ? (
                <div style={{ fontSize: 12, color: '#666', marginTop: 6, whiteSpace: 'pre-wrap' }}>
                  {c.notes}
                </div>
              ) : null}
            </div>
            <Link
              href={`/customers/${encodeURIComponent(c.phone_number)}`}
              style={{
                fontSize: 13,
                padding: '6px 10px',
                borderRadius: 6,
                border: '1px solid #ddd',
                color: '#111',
                textDecoration: 'none',
                alignSelf: 'start',
              }}
            >
              Editar
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
