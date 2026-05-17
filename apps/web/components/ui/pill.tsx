import type { ReactNode } from 'react';
import { clsx } from '@/lib/clsx';

type Variant = 'agent-active' | 'paused' | 'unread' | 'neutral' | 'ink';

const VARIANT_CLASS: Record<Variant, string> = {
  'agent-active': 'bg-sage-100 text-sage-700',
  paused: 'bg-amber-100 text-amber-700',
  unread: 'bg-terracotta-50 text-terracotta-600',
  neutral: 'bg-sand-200/70 text-ink-muted',
  ink: 'bg-ink text-paper',
};

const DOT_CLASS: Partial<Record<Variant, string>> = {
  'agent-active': 'bg-sage-500',
  paused: 'bg-amber-500 animate-pulse-soft',
  unread: 'bg-terracotta-500',
};

export function Pill({
  variant = 'neutral',
  dot = false,
  className,
  children,
}: {
  variant?: Variant;
  dot?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const dotClass = DOT_CLASS[variant];
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-medium uppercase tracking-[0.06em] leading-none whitespace-nowrap',
        VARIANT_CLASS[variant],
        className,
      )}
    >
      {dot && dotClass ? (
        <span className={clsx('inline-block size-1.5 rounded-full', dotClass)} />
      ) : null}
      {children}
    </span>
  );
}
