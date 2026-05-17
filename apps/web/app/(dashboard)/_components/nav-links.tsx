'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from '@/lib/clsx';

const LINKS = [
  { href: '/conversations', label: 'Conversas' },
  { href: '/customers', label: 'Clientes' },
  { href: '/prompt', label: 'Prompt' },
  { href: '/settings', label: 'Ajustes' },
] as const;

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="hidden sm:flex items-center gap-1 text-sm">
      {LINKS.map((link) => {
        const active = pathname === link.href || pathname.startsWith(link.href + '/');
        return (
          <Link
            key={link.href}
            href={link.href}
            data-active={active || undefined}
            className={clsx(
              'relative px-3 py-1.5 rounded-full transition-colors duration-150',
              'text-ink-muted hover:text-ink',
              'data-[active]:text-ink data-[active]:bg-sand-200/50',
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
