'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Conversation, CustomerProfile, Message } from '@chinelaria/db';
import { Avatar } from '@/components/ui/avatar';
import { Pill } from '@/components/ui/pill';
import { IconButton } from '@/components/ui/icon-button';
import { clsx } from '@/lib/clsx';

type ConversationWithCustomer = Conversation & { customer_profiles: CustomerProfile | null };

const ROLE_LABEL: Record<string, string> = {
  agent: 'Agente',
  human: 'Operador',
  customer: 'Cliente',
};

export default function ThreadView({
  conversation,
  initialMessages,
}: {
  conversation: ConversationWithCustomer;
  initialMessages: Message[];
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [conv, setConv] = useState(conversation);
  const [draft, setDraft] = useState('');
  const [pending, startTransition] = useTransition();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  useEffect(() => {
    setConv(conversation);
    setMessages(initialMessages);
  }, [conversation, initialMessages]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const ch = supabase
      .channel(`conv-${conversation.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversation.id}` },
        (payload) => setMessages((prev) => [...prev, payload.new as Message]),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'conversations', filter: `id=eq.${conversation.id}` },
        (payload) => setConv((prev) => ({ ...prev, ...(payload.new as Partial<Conversation>) })),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [conversation.id]);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  // Body scroll lock for mobile drawer
  useEffect(() => {
    if (!drawerOpen) return;
    const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
    if (isDesktop) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  // Escape closes drawer
  useEffect(() => {
    if (!drawerOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setDrawerOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  function send(e?: React.FormEvent) {
    e?.preventDefault();
    const text = draft.trim();
    if (!text) return;
    startTransition(async () => {
      const res = await fetch(`/api/conversations/${conversation.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (res.ok) setDraft('');
    });
  }

  function togglePause() {
    startTransition(async () => {
      await fetch(`/api/conversations/${conversation.id}/pause`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paused: !conv.agent_paused, reason: 'manual' }),
      });
    });
  }

  const customer = conversation.customer_profiles;
  const displayName = customer?.display_name ?? conv.phone_number;

  return (
    <div className="grid h-full grid-rows-[auto_minmax(0,1fr)_auto] lg:grid-rows-1 lg:grid-cols-[minmax(0,1fr)_auto] bg-paper relative">
      <div className="contents lg:grid lg:grid-rows-[auto_minmax(0,1fr)_auto] lg:min-h-0">
        <ThreadHeader
          name={displayName}
          phone={conv.phone_number}
          paused={conv.agent_paused}
          pausedReason={conv.paused_reason}
          pending={pending}
          onTogglePause={togglePause}
          onBack={() => router.push('/conversations')}
          onOpenCustomer={() => setDrawerOpen(true)}
        />

        <div ref={scrollerRef} className="overflow-y-auto px-3 sm:px-6 py-6 bg-paper">
          {messages.length === 0 ? (
            <div className="h-full grid place-items-center text-center px-6">
              <div className="max-w-xs">
                <p className="font-serif text-[17px] text-ink-muted italic">
                  Sem mensagens nesta conversa ainda.
                </p>
                <p className="text-[12px] text-ink-muted/70 mt-2">
                  Quando o cliente escrever, as mensagens aparecem aqui em tempo real.
                </p>
              </div>
            </div>
          ) : (
            <MessageList messages={messages} />
          )}
        </div>

        <Composer
          ref={formRef}
          value={draft}
          onChange={setDraft}
          onSubmit={send}
          paused={conv.agent_paused}
          pending={pending}
        />
      </div>

      <CustomerPanel
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        customer={customer}
        phone={conv.phone_number}
      />
    </div>
  );
}

/* ---------- Header ---------- */

function ThreadHeader({
  name,
  phone,
  paused,
  pausedReason,
  pending,
  onTogglePause,
  onBack,
  onOpenCustomer,
}: {
  name: string;
  phone: string;
  paused: boolean;
  pausedReason: string | null;
  pending: boolean;
  onTogglePause: () => void;
  onBack: () => void;
  onOpenCustomer: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-sand-200 bg-paper-soft/85 backdrop-blur supports-[backdrop-filter]:bg-paper-soft/70">
      <div className="flex items-center gap-2.5 sm:gap-3 h-14 px-2 sm:px-5">
        <IconButton aria-label="Voltar para conversas" className="lg:hidden" onClick={onBack}>
          <ChevronLeftIcon />
        </IconButton>
        <Avatar name={name === phone ? null : name} phone={phone} size="md" />
        <div className="min-w-0 flex-1">
          <div className="font-serif text-[16px] sm:text-[17px] leading-tight text-ink truncate">
            {name}
          </div>
          <div className="text-[11px] text-ink-muted tabular-nums">{phone}</div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <Pill variant={paused ? 'paused' : 'agent-active'} dot className="hidden sm:inline-flex">
            {paused ? `pausado${pausedReason ? ` · ${pausedReason}` : ''}` : 'agente ativo'}
          </Pill>

          <button
            type="button"
            onClick={onTogglePause}
            disabled={pending}
            className={clsx(
              'hidden sm:inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium border transition-colors',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-terracotta-500/40',
              paused
                ? 'border-sage-500/30 bg-sage-50 text-sage-700 hover:bg-sage-100'
                : 'border-amber-500/30 bg-amber-50 text-amber-700 hover:bg-amber-100',
              'disabled:opacity-50 disabled:cursor-wait',
            )}
          >
            {paused ? <PlayIcon /> : <PauseIcon />}
            {paused ? 'Reativar agente' : 'Pausar agente'}
          </button>

          <IconButton
            aria-label={paused ? 'Reativar agente' : 'Pausar agente'}
            className="sm:hidden"
            onClick={onTogglePause}
            disabled={pending}
          >
            {paused ? <PlayIcon /> : <PauseIcon />}
          </IconButton>

          <IconButton
            aria-label="Abrir detalhes do cliente"
            className="lg:hidden"
            onClick={onOpenCustomer}
          >
            <UserIcon />
          </IconButton>
        </div>
      </div>
    </header>
  );
}

/* ---------- Message list with date separators ---------- */

function MessageList({ messages }: { messages: Message[] }) {
  const items = useMemo(() => buildItems(messages), [messages]);
  const total = items.filter((i) => i.kind === 'message').length;
  let messageIdx = -1;

  return (
    <div className="flex flex-col gap-1">
      {items.map((item, i) => {
        if (item.kind === 'separator') {
          return <DateSeparator key={`sep-${i}`} label={item.label} />;
        }
        messageIdx += 1;
        return (
          <MessageBubble
            key={item.message.id}
            message={item.message}
            prevRole={item.prevRole}
            staggerIdx={messageIdx >= total - 8 ? messageIdx - Math.max(0, total - 8) : -1}
          />
        );
      })}
    </div>
  );
}

type Item =
  | { kind: 'separator'; label: string }
  | { kind: 'message'; message: Message; prevRole: string | null };

function buildItems(messages: Message[]): Item[] {
  const out: Item[] = [];
  let lastDay: string | null = null;
  let prevRole: string | null = null;
  for (const m of messages) {
    const day = dayKey(m.created_at);
    if (day !== lastDay) {
      out.push({ kind: 'separator', label: dayLabel(m.created_at) });
      lastDay = day;
      prevRole = null;
    }
    out.push({ kind: 'message', message: m, prevRole });
    prevRole = m.role;
  }
  return out;
}

function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Ontem';
  if (diffDays < 7) {
    return d.toLocaleDateString('pt-BR', { weekday: 'long' });
  }
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
}

function DateSeparator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-4 first:mt-0">
      <div className="h-px flex-1 bg-sand-200" />
      <span className="text-[10px] uppercase tracking-[0.12em] text-ink-muted font-medium">
        {label}
      </span>
      <div className="h-px flex-1 bg-sand-200" />
    </div>
  );
}

/* ---------- Message Bubble ---------- */

const ROLE_BUBBLE: Record<string, { wrap: string; bubble: string; meta: string; tail: string }> = {
  customer: {
    wrap: 'justify-start',
    bubble: 'bg-paper-soft border border-sand-200 text-ink rounded-2xl rounded-bl-md',
    meta: 'text-ink-muted',
    tail: 'text-left',
  },
  agent: {
    wrap: 'justify-end',
    bubble:
      'bg-sage-100 border border-sage-500/15 text-sage-700 rounded-2xl rounded-br-md',
    meta: 'text-sage-700/65',
    tail: 'text-right',
  },
  human: {
    wrap: 'justify-end',
    bubble:
      'bg-amber-100 border border-amber-500/25 text-amber-700 rounded-2xl rounded-br-md',
    meta: 'text-amber-700/70',
    tail: 'text-right',
  },
};

function MessageBubble({
  message,
  prevRole,
  staggerIdx,
}: {
  message: Message;
  prevRole: string | null;
  staggerIdx: number;
}) {
  const role = ROLE_BUBBLE[message.role] ?? ROLE_BUBBLE.customer!;
  const showRoleLabel = message.role !== 'customer' && prevRole !== message.role;
  const stagger = staggerIdx >= 0 ? `${staggerIdx * 30}ms` : '0ms';
  const time = new Date(message.created_at).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={clsx('flex w-full', role.wrap)}>
      <div className="max-w-[85%] sm:max-w-[68%] flex flex-col gap-0.5">
        {showRoleLabel ? (
          <div
            className={clsx(
              'text-[10px] uppercase tracking-[0.12em] font-medium px-1',
              role.tail,
              role.meta,
            )}
          >
            {ROLE_LABEL[message.role] ?? message.role}
          </div>
        ) : null}
        <div
          style={{ animationDelay: stagger }}
          className={clsx(
            'px-3.5 py-2.5 text-[14.5px] leading-relaxed whitespace-pre-wrap break-words shadow-soft animate-bubble-in',
            role.bubble,
          )}
        >
          <MessageMedia message={message} role={message.role} />
          {message.content ? <div>{message.content}</div> : null}
          <div className={clsx('mt-1.5 text-[10.5px] tabular-nums', role.meta, role.tail)}>
            {time}
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageMedia({ message, role }: { message: Message; role: string }) {
  const url = message.media_url;
  const type = message.media_type;
  if (!url || !type) {
    if (type) {
      // No url, but media flagged — keep the placeholder
      return (
        <div className="text-[12px] italic opacity-70 mb-1.5">
          [{type}
          {message.media_mimetype ? ` · ${message.media_mimetype}` : ''}]
        </div>
      );
    }
    return null;
  }

  const baseImg =
    'rounded-xl block max-h-80 w-auto mb-2 bg-sand-200/40 animate-scale-in object-contain';

  if (type === 'image') {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" loading="lazy" className={baseImg} />;
  }
  if (type === 'video') {
    return (
      <video
        src={url}
        controls
        preload="metadata"
        className="rounded-xl block max-h-80 w-auto mb-2 bg-ink animate-scale-in"
      />
    );
  }
  if (type === 'audio') {
    return <audio src={url} controls className="w-full mb-2" />;
  }
  // documents and unknown
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={clsx(
        'inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[12px] mb-1.5 max-w-full',
        role === 'customer'
          ? 'border-sand-300 bg-paper hover:bg-sand-100'
          : 'border-current/25 bg-current/5 hover:bg-current/10',
      )}
    >
      <PaperclipIcon />
      <span className="truncate">{type}{message.media_mimetype ? ` · ${message.media_mimetype}` : ''}</span>
    </a>
  );
}

/* ---------- Composer ---------- */

const Composer = ({
  ref: formRef,
  value,
  onChange,
  onSubmit,
  paused,
  pending,
}: {
  ref: React.RefObject<HTMLFormElement | null>;
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  paused: boolean;
  pending: boolean;
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }, [value]);

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      formRef.current?.requestSubmit();
    }
  }

  const placeholder = paused
    ? 'Responder como humano…'
    : 'Responder como humano (vai pausar o agente nesta conversa)';

  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="border-t border-sand-200 bg-paper-soft/90 backdrop-blur-sm px-3 sm:px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
    >
      <div className="flex items-end gap-2">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            disabled={pending}
            rows={1}
            className={clsx(
              'w-full resize-none bg-paper rounded-2xl border border-sand-300 px-4 py-2.5',
              'text-[15px] leading-snug text-ink placeholder:text-ink-muted/80',
              'focus:outline-none focus:border-terracotta-500/60 focus:ring-2 focus:ring-terracotta-500/15',
              'disabled:opacity-60 transition-colors',
              'min-h-[44px] max-h-40 overflow-y-auto',
            )}
          />
        </div>
        <button
          type="submit"
          disabled={pending || !value.trim()}
          aria-label="Enviar mensagem"
          className={clsx(
            'shrink-0 grid place-items-center size-11 rounded-full',
            'bg-terracotta-500 text-paper shadow-soft',
            'hover:bg-terracotta-600 active:scale-95 transition-all duration-150',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-terracotta-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
            'disabled:bg-sand-300 disabled:text-ink-muted disabled:cursor-not-allowed disabled:active:scale-100',
          )}
        >
          {pending ? <SpinnerIcon /> : <SendIcon />}
        </button>
      </div>
      <p className="hidden sm:block text-[10.5px] text-ink-muted/80 mt-2 px-1">
        Enter envia · Shift+Enter quebra linha
      </p>
    </form>
  );
};

/* ---------- Customer Panel (drawer) ---------- */

function CustomerPanel({
  open,
  onClose,
  customer,
  phone,
}: {
  open: boolean;
  onClose: () => void;
  customer: CustomerProfile | null;
  phone: string;
}) {
  const fields: Array<[string, string]> = [
    ['Nome', customer?.display_name ?? '—'],
    ['Telefone', phone],
    ['Tamanho', customer?.size_pref ?? '—'],
    ['Marcas', (customer?.brand_prefs ?? []).join(', ') || '—'],
    [
      'Última visita',
      customer?.last_seen_at
        ? new Date(customer.last_seen_at).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })
        : '—',
    ],
  ];

  return (
    <>
      {/* Mobile backdrop */}
      <div
        data-open={open || undefined}
        onClick={onClose}
        aria-hidden={!open}
        className={clsx(
          'fixed inset-0 z-30 bg-ink/30 opacity-0 pointer-events-none transition-opacity duration-300',
          'data-[open]:opacity-100 data-[open]:pointer-events-auto',
          'lg:hidden',
        )}
      />
      <aside
        data-open={open || undefined}
        aria-label="Detalhes do cliente"
        className={clsx(
          // mobile: bottom sheet
          'fixed inset-x-0 bottom-0 z-40 max-h-[85dvh] overflow-y-auto',
          'rounded-t-3xl bg-paper-soft border-t border-sand-200 shadow-paper',
          'translate-y-full data-[open]:translate-y-0 transition-transform duration-300 ease-out',
          // desktop: inline aside
          'lg:static lg:translate-y-0 lg:max-h-none lg:rounded-none lg:border-t-0 lg:border-l lg:border-sand-200',
          'lg:w-[300px] lg:shrink-0 lg:shadow-none lg:bg-paper-soft/30 lg:overflow-y-auto',
        )}
      >
        {/* Drag handle (mobile only) */}
        <div className="lg:hidden pt-2.5 pb-1 flex justify-center">
          <div className="h-1.5 w-12 rounded-full bg-sand-300" />
        </div>

        <div className="px-5 pt-3 pb-[calc(1.5rem+env(safe-area-inset-bottom))] lg:pt-6 lg:pb-6">
          <div className="flex items-baseline justify-between mb-5">
            <h3 className="font-serif text-[20px] leading-none text-ink">Cliente</h3>
            <button
              type="button"
              onClick={onClose}
              className="lg:hidden text-[12px] text-ink-muted hover:text-ink"
            >
              Fechar
            </button>
          </div>

          {customer ? (
            <div className="flex items-center gap-3 mb-5 pb-5 border-b border-sand-200">
              <Avatar name={customer.display_name} phone={phone} size="lg" />
              <div className="min-w-0">
                <div className="font-serif text-[16px] text-ink truncate">
                  {customer.display_name ?? phone}
                </div>
                <div className="text-[11px] text-ink-muted tabular-nums">{phone}</div>
              </div>
            </div>
          ) : (
            <div className="mb-5 pb-5 border-b border-sand-200">
              <div className="flex items-center gap-3">
                <Avatar phone={phone} size="lg" />
                <div className="min-w-0">
                  <div className="font-serif text-[16px] text-ink-muted italic">
                    Cliente anônimo
                  </div>
                  <div className="text-[11px] text-ink-muted tabular-nums">{phone}</div>
                </div>
              </div>
            </div>
          )}

          <dl className="flex flex-col">
            {fields.map(([label, value]) => (
              <div
                key={label}
                className="border-b border-sand-200/60 last:border-0 py-3"
              >
                <dt className="text-[10px] uppercase tracking-[0.12em] text-ink-muted font-medium">
                  {label}
                </dt>
                <dd className="mt-1 text-[14px] text-ink leading-snug break-words">{value}</dd>
              </div>
            ))}
            {customer?.notes ? (
              <div className="border-b border-sand-200/60 last:border-0 py-3">
                <dt className="text-[10px] uppercase tracking-[0.12em] text-ink-muted font-medium">
                  Anotações
                </dt>
                <dd className="mt-1 text-[14px] text-ink leading-relaxed whitespace-pre-wrap">
                  {customer.notes}
                </dd>
              </div>
            ) : null}
          </dl>
        </div>
      </aside>
    </>
  );
}

/* ---------- Icons (inline SVG) ---------- */

function ChevronLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4.5" aria-hidden="true">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-3.5" aria-hidden="true">
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-3.5" aria-hidden="true">
      <path d="M7 5v14l12-7z" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="size-4.5" aria-hidden="true">
      <path d="M20 21a8 8 0 1 0-16 0" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4.5 -ml-0.5" aria-hidden="true">
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-4.5 animate-spin" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function PaperclipIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="size-3.5 shrink-0" aria-hidden="true">
      <path d="m21.44 11.05-9.19 9.19a6 6 0 1 1-8.49-8.49l8.57-8.57A4 4 0 1 1 17.93 8.8l-8.57 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  );
}
