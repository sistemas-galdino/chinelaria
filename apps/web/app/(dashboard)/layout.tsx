import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <div style={{ display: 'grid', gridTemplateRows: 'auto 1fr', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <header
        style={{
          padding: '12px 20px',
          borderBottom: '1px solid #eee',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          background: '#fff',
        }}
      >
        <strong style={{ fontSize: 16 }}>Chinelaria</strong>
        <nav style={{ display: 'flex', gap: 12, fontSize: 14 }}>
          <a href="/conversations">Conversas</a>
          <a href="/customers">Clientes</a>
          <a href="/prompt">Prompt</a>
          <a href="/settings">Configurações</a>
        </nav>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: '#666', fontSize: 13 }}>{user.email}</span>
          <form action="/auth/sign-out" method="post">
            <button
              type="submit"
              style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}
            >
              Sair
            </button>
          </form>
        </div>
      </header>
      <main style={{ background: '#fafafa' }}>{children}</main>
    </div>
  );
}
