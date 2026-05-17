'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Conversation, CustomerProfile } from '@chinelaria/db';
import { Avatar } from '@/components/ui/avatar';
import { Pill } from '@/components/ui/pill';
import { clsx } from '@/lib/clsx';

type Row = Conversation & { customer_profiles: Pick<CustomerProfile, 'display_name'> | null };

const FILTERS = [
  { id: 'all', label: 'Todas' },
  { id: 'unread', label: 'Não lidas' },
  { id: 'paused', label: 'Pausadas' },
] as const;

export default function ConversationList({ initial }: { initial: Row[] }) {
  const [rows, setRows] = useState<Row[]>(initial);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('all');
  const pathname = usePathname();
  const channelName = useMemo(
    () => `conversations-list-${Math.random().toString(36).slice(2, 10)}`,
    [],
  );

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, async () => {
        const { data } = await supabase
          .from('conversations')
          .select('*, customer_profiles(display_name)')
          .order('last_message_at', { ascending: false, nullsFirst: false })
          .limit(100);
        if (data) setRows(data as Row[]);
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [channelName]);

  const filtered = rows.filter((r) => {
    if (filter === 'paused') return r.agent_paused;
    if (filter === 'unread') return r.unread_count > 0;
    return true;
  });

  return (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 border-b border-sand-200 bg-paper-soft/85 backdrop-blur-sm px-4 pt-4 pb-3">
        <div className="flex items-baseline gap-3 mb-3">
          <h1 className="font-serif text-[26px] leading-none tracking-tight text-ink">
            Conversas
          </h1>
          <span className="text-[12px] text-ink-muted tabular-nums">
            {filtered.length}
          </span>
        </div>
        <div className="flex gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              data-active={filter === f.id || undefined}
              className={clsx(
                'rounded-full px-3 py-1 text-[11.5px] font-medium tracking-wide transition-colors duration-150',
                'bg-sand-200/60 text-ink-muted hover:bg-sand-200 hover:text-ink',
                'data-[active]:bg-ink data-[active]:text-paper data-[active]:hover:bg-ink-soft',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <ul className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        {filtered.length === 0 ? (
          <li className="text-center text-ink-muted text-sm font-serif italic py-12">
            Nenhuma conversa por aqui ainda.
          </li>
        ) : null}
        {filtered.map((row) => {
          const active = pathname === `/conversations/${row.id}`;
          const name = row.customer_profiles?.display_name ?? row.phone_number;
          return (
            <li key={row.id}>
              <Link
                href={`/conversations/${row.id}`}
                data-active={active || undefined}
                className={clsx(
                  'group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-card px-3 py-2.5',
                  'transition-colors duration-150',
                  'hover:bg-paper-soft',
                  'data-[active]:bg-paper-soft data-[active]:shadow-soft data-[active]:ring-1 data-[active]:ring-sand-200',
                )}
              >
                <Avatar name={row.customer_profiles?.display_name} phone={row.phone_number} size="md" />

                <div className="min-w-0">
                  <div className="flex items-baseline gap-2 min-w-0">
                    <span className="font-serif text-[15px] text-ink truncate">{name}</span>
                    {row.customer_profiles?.display_name ? (
                      <span className="text-[10.5px] text-ink-muted shrink-0 tabular-nums">
                        {row.phone_number}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    {row.agent_paused ? (
                      <Pill variant="paused" dot>
                        pausado
                      </Pill>
                    ) : (
                      <Pill variant="agent-active" dot>
                        agente ativo
                      </Pill>
                    )}
                    {row.unread_count > 0 ? (
                      <Pill variant="unread">
                        {row.unread_count} nova{row.unread_count === 1 ? '' : 's'}
                      </Pill>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className="text-[10.5px] text-ink-muted tabular-nums">
                    {row.last_message_at ? formatRelative(row.last_message_at) : '—'}
                  </span>
                  {row.unread_count > 0 ? (
                    <span className="size-2 rounded-full bg-terracotta-500 shadow-[0_0_0_3px_rgba(200,89,58,0.12)]" />
                  ) : (
                    <span className="size-2" />
                  )}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const now = Date.now();
  const diff = (now - d.getTime()) / 1000;
  if (diff < 60) return 'agora';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 86400 * 7) {
    return d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
  }
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}
