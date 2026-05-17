import { clsx } from '@/lib/clsx';

const TONES = ['terracotta', 'sage', 'amber', 'ink', 'sand'] as const;
type Tone = (typeof TONES)[number];

const TONE_CLASS: Record<Tone, string> = {
  terracotta: 'avatar-tone-terracotta',
  sage: 'avatar-tone-sage',
  amber: 'avatar-tone-amber',
  ink: 'avatar-tone-ink',
  sand: 'avatar-tone-sand',
};

const SIZE_CLASS = {
  sm: 'size-7 text-[11px]',
  md: 'size-9 text-[13px]',
  lg: 'size-11 text-[15px]',
} as const;

function hash(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function initialsOf(name: string | null | undefined, phone: string): string {
  const trimmed = name?.trim();
  if (trimmed) {
    const parts = trimmed.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
    if (parts[0]) {
      const word = parts[0];
      return word.length >= 2 ? word.slice(0, 2).toUpperCase() : word[0]!.toUpperCase();
    }
  }
  const digits = phone.replace(/\D/g, '');
  return digits.slice(-2) || '··';
}

export function Avatar({
  name,
  phone,
  size = 'md',
  className,
}: {
  name?: string | null;
  phone: string;
  size?: keyof typeof SIZE_CLASS;
  className?: string;
}) {
  const tone: Tone = TONES[hash(name || phone) % TONES.length]!;
  const initials = initialsOf(name, phone);

  return (
    <span
      aria-hidden="true"
      className={clsx(
        'grid place-items-center rounded-full font-serif font-medium leading-none shrink-0 select-none ring-1 ring-black/5',
        SIZE_CLASS[size],
        TONE_CLASS[tone],
        className,
      )}
    >
      {initials}
    </span>
  );
}
