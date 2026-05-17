import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { clsx } from '@/lib/clsx';

const SIZE_CLASS = {
  sm: 'size-8',
  md: 'size-9',
  lg: 'size-10',
} as const;

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  'aria-label': string;
  size?: keyof typeof SIZE_CLASS;
  variant?: 'ghost' | 'soft' | 'outline';
  children: ReactNode;
};

const VARIANT_CLASS = {
  ghost: 'hover:bg-sand-200/60 active:bg-sand-200/80 text-ink',
  soft: 'bg-paper-soft hover:bg-sand-200/60 text-ink border border-sand-200',
  outline: 'border border-sand-300 bg-paper hover:bg-sand-100 text-ink',
} as const;

export function IconButton({
  size = 'md',
  variant = 'ghost',
  className,
  children,
  ...props
}: Props) {
  return (
    <button
      type="button"
      {...props}
      className={clsx(
        'grid place-items-center rounded-full transition-colors duration-150',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-terracotta-500/40 focus-visible:ring-offset-1 focus-visible:ring-offset-paper',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        SIZE_CLASS[size],
        VARIANT_CLASS[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}
