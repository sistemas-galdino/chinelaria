'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Conversation, CustomerProfile } from '@chinelaria/db';

type Row = Conversation & { customer_profiles: Pick<CustomerProfile, 'display_name'> | null };

export default function ConversationList({ initial }: { initial: Row[] }) {
  const [rows, setRows] = useState<Row[]>(initial);
  const [filter, setFilter] = useState<'all' | 'paused' | 'unread'>('all');

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel('conversations-list')
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
  }, []);

  const filtered = rows.filter((r) => {
    if (filter === 'paused') return r.agent_paused;
    if (filter === 'unread') return r.unread_count > 0;
    return true;
  });

  return (
    <div style={{ display: 'grid', gap: 12, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h1 style={{ margin: 0 }}>Conversas</h1>
        <span style={{ color: '#888', fontSize: 13 }}>{filtered.length}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          {(['all', 'unread', 'paused'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              style={{
                padding: '6px 10px',
                borderRadius: 6,
                border: '1px solid #ddd',
                background: filter === f ? '#111' : '#fff',
                color: filter === f ? '#fff' : '#111',
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              {f === 'all' ? 'Todas' : f === 'unread' ? 'Não lidas' : 'Pausadas'}
            </button>
          ))}
        </div>
      </div>

      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 6 }}>
        {filtered.length === 0 ? (
          <li style={{ color: '#888', padding: 20, textAlign: 'center' }}>
            Nenhuma conversa por aqui ainda.
          </li>
        ) : null}
        {filtered.map((row) => (
          <li key={row.id}>
            <Link
              href={`/conversations/${row.id}`}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                alignItems: 'center',
                gap: 10,
                padding: 12,
                background: '#fff',
                borderRadius: 8,
                border: '1px solid #eee',
                textDecoration: 'none',
                color: '#111',
              }}
            >
              <div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                  <strong style={{ fontSize: 15 }}>
                    {row.customer_profiles?.display_name ?? row.phone_number}
                  </strong>
                  <span style={{ fontSize: 12, color: '#999' }}>{row.phone_number}</span>
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                  {row.agent_paused ? (
                    <span style={badgeStyle('#fef3c7', '#92400e')}>
                      pausado{row.paused_reason ? ` (${row.paused_reason})` : ''}
                    </span>
                  ) : (
                    <span style={badgeStyle('#dcfce7', '#166534')}>agente ativo</span>
                  )}
                  {row.unread_count > 0 ? (
                    <span style={badgeStyle('#dbeafe', '#1e40af')}>{row.unread_count} não lida(s)</span>
                  ) : null}
                </div>
              </div>
              <div style={{ fontSize: 12, color: '#888', textAlign: 'right' }}>
                {row.last_message_at ? formatRelative(row.last_message_at) : '—'}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function badgeStyle(bg: string, fg: string): React.CSSProperties {
  return {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 999,
    background: bg,
    color: fg,
    fontSize: 11,
    fontWeight: 500,
  };
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const now = Date.now();
  const diff = (now - d.getTime()) / 1000;
  if (diff < 60) return 'agora';
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}
