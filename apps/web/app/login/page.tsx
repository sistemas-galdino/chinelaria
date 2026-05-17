'use client';

import { Suspense, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { clsx } from '@/lib/clsx';

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
    <main className="min-h-dvh grid place-items-center px-5 py-10 relative z-[2]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-baseline gap-1.5 mb-3">
            <span className="font-serif text-[34px] leading-none tracking-tight text-ink">
              Chinelaria
            </span>
            <span className="inline-block size-2 rounded-full bg-terracotta-500" />
          </div>
          <p className="text-[13px] text-ink-muted tracking-wide uppercase">
            Painel de atendimento
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="bg-paper-soft rounded-3xl p-7 border border-sand-200 shadow-paper flex flex-col gap-5"
        >
          <Field label="E-mail">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              className={inputClass}
              placeholder="voce@exemplo.com"
            />
          </Field>

          <Field label="Senha">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className={inputClass}
              placeholder="••••••••"
            />
          </Field>

          {error ? (
            <p
              role="alert"
              className="text-[12px] text-terracotta-700 bg-terracotta-50 border border-terracotta-100 rounded-xl px-3 py-2 leading-snug"
            >
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className={clsx(
              'mt-1 w-full rounded-2xl px-4 py-3 text-[14.5px] font-medium tracking-wide',
              'bg-ink text-paper hover:bg-ink-soft active:scale-[0.99] transition-all duration-150',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-terracotta-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
              'disabled:opacity-60 disabled:cursor-wait disabled:active:scale-100',
            )}
          >
            {pending ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-[11px] text-ink-muted/80 mt-6 font-serif italic">
          Atendimento WhatsApp com agente de IA
        </p>
      </div>
    </main>
  );
}

const inputClass = clsx(
  'w-full rounded-xl border border-sand-300 bg-paper px-4 py-2.5',
  'text-[14.5px] text-ink placeholder:text-ink-muted/60',
  'focus:outline-none focus:border-terracotta-500/60 focus:ring-2 focus:ring-terracotta-500/15',
  'transition-colors',
);

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] uppercase tracking-[0.12em] text-ink-muted font-medium">
        {label}
      </span>
      {children}
    </label>
  );
}
