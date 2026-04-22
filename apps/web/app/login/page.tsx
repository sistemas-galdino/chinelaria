'use client';

import { Suspense, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get('next') ?? '/conversations';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const supabase = getSupabaseBrowserClient();
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) {
        setError(err.message);
        return;
      }
      router.replace(next);
      router.refresh();
    });
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: '#fafafa',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <form
        onSubmit={onSubmit}
        style={{
          width: 360,
          padding: '2rem',
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 1px 3px rgba(0,0,0,.08)',
          display: 'grid',
          gap: 14,
        }}
      >
        <h1 style={{ margin: 0, fontSize: 22 }}>Chinelaria — Atendimento</h1>
        <p style={{ margin: 0, color: '#666', fontSize: 13 }}>Entre com seu e-mail e senha.</p>
        <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
          E-mail
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14 }}
          />
        </label>
        <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
          Senha
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14 }}
          />
        </label>
        {error ? (
          <p
            role="alert"
            style={{ margin: 0, color: '#c00', fontSize: 13, background: '#fee', padding: 8, borderRadius: 6 }}
          >
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          style={{
            padding: '10px 12px',
            borderRadius: 8,
            border: 'none',
            background: pending ? '#999' : '#111',
            color: '#fff',
            fontSize: 14,
            cursor: pending ? 'wait' : 'pointer',
          }}
        >
          {pending ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </main>
  );
}
