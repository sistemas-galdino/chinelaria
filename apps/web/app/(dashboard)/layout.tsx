import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { NavLinks } from './_components/nav-links';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <div className="grid grid-rows-[auto_1fr] min-h-dvh relative z-[2]">
      <header className="sticky top-0 z-30 border-b border-sand-200 bg-paper-soft/80 backdrop-blur supports-[backdrop-filter]:bg-paper-soft/65">
        <div className="flex items-center gap-4 px-4 sm:px-6 h-14">
          <a href="/conversations" className="flex items-baseline gap-1.5 group">
            <span className="font-serif text-[22px] leading-none tracking-tight text-ink">
              Chinelaria
            </span>
            <span className="inline-block size-1.5 rounded-full bg-terracotta-500 transition-transform group-hover:scale-125" />
          </a>
          <NavLinks />
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden md:inline text-[12px] text-ink-muted truncate max-w-[180px]">
              {user.email}
            </span>
            <form action="/auth/sign-out" method="post">
              <button
                type="submit"
                className="rounded-full border border-sand-300 bg-paper px-3 py-1.5 text-[12px] font-medium text-ink-soft hover:bg-sand-100 transition-colors"
              >
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="min-h-0 bg-paper">{children}</main>
    </div>
  );
}
