'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Conversation, CustomerProfile, Message } from '@chinelaria/db';

type ConversationWithCustomer = Conversation & { customer_profiles: CustomerProfile | null };

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
  const scrollerRef = useRef<HTMLDivElement>(null);

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

  function send(e: React.FormEvent) {
    e.preventDefault();
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

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', height: 'calc(100vh - 49px)' }}>
      <section style={{ display: 'grid', gridTemplateRows: 'auto 1fr auto', minHeight: 0 }}>
        <header
          style={{
            padding: '10px 16px',
            borderBottom: '1px solid #eee',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: '#fff',
          }}
        >
          <div>
            <div style={{ fontWeight: 600 }}>{customer?.display_name ?? conv.phone_number}</div>
            <div style={{ fontSize: 12, color: '#888' }}>{conv.phone_number}</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={badgeStyle(conv.agent_paused ? '#fef3c7' : '#dcfce7', conv.agent_paused ? '#92400e' : '#166534')}>
              {conv.agent_paused ? `agente pausado${conv.paused_reason ? ` (${conv.paused_reason})` : ''}` : 'agente ativo'}
            </span>
            <button
              type="button"
              onClick={togglePause}
              disabled={pending}
              style={{
                padding: '6px 10px',
                borderRadius: 6,
                border: '1px solid #ddd',
                background: '#fff',
                cursor: pending ? 'wait' : 'pointer',
                fontSize: 13,
              }}
            >
              {conv.agent_paused ? 'Reativar agente' : 'Pausar agente'}
            </button>
          </div>
        </header>

        <div ref={scrollerRef} style={{ overflowY: 'auto', padding: 16, display: 'grid', gap: 8, alignContent: 'start' }}>
          {messages.length === 0 ? (
            <p style={{ color: '#888', textAlign: 'center', marginTop: 60 }}>
              Sem mensagens nesta conversa ainda.
            </p>
          ) : null}
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}
        </div>

        <form
          onSubmit={send}
          style={{ borderTop: '1px solid #eee', padding: 12, display: 'flex', gap: 8, background: '#fff' }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={conv.agent_paused ? 'Responder como humano…' : 'Responder como humano (vai pausar o agente nesta conversa)'}
            style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14 }}
            disabled={pending}
          />
          <button
            type="submit"
            disabled={pending || !draft.trim()}
            style={{
              padding: '10px 16px',
              borderRadius: 8,
              border: 'none',
              background: pending ? '#999' : '#111',
              color: '#fff',
              fontSize: 14,
              cursor: pending ? 'wait' : 'pointer',
            }}
          >
            Enviar
          </button>
        </form>
      </section>

      <aside style={{ borderLeft: '1px solid #eee', padding: 16, background: '#fff', overflowY: 'auto' }}>
        <h3 style={{ marginTop: 0 }}>Cliente</h3>
        <dl style={{ display: 'grid', gap: 8, fontSize: 13 }}>
          <Field label="Nome" value={customer?.display_name ?? '—'} />
          <Field label="Telefone" value={conv.phone_number} />
          <Field label="Tamanho" value={customer?.size_pref ?? '—'} />
          <Field label="Marcas" value={(customer?.brand_prefs ?? []).join(', ') || '—'} />
          <Field label="Última visita" value={customer?.last_seen_at ? new Date(customer.last_seen_at).toLocaleString('pt-BR') : '—'} />
          {customer?.notes ? (
            <div>
              <dt style={{ color: '#888', fontSize: 12 }}>Anotações</dt>
              <dd style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{customer.notes}</dd>
            </div>
          ) : null}
        </dl>
      </aside>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt style={{ color: '#888', fontSize: 12 }}>{label}</dt>
      <dd style={{ margin: 0 }}>{value}</dd>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isCustomer = message.role === 'customer';
  const isHuman = message.role === 'human';
  const align = isCustomer ? 'flex-start' : 'flex-end';
  const bg = isCustomer ? '#fff' : isHuman ? '#fde68a' : '#dcfce7';
  const border = isCustomer ? '1px solid #e5e7eb' : 'none';

  return (
    <div style={{ display: 'flex', justifyContent: align }}>
      <div
        style={{
          maxWidth: '70%',
          padding: '8px 12px',
          background: bg,
          border,
          borderRadius: 12,
          fontSize: 14,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {message.media_type ? (
          <div style={{ fontStyle: 'italic', color: '#666', marginBottom: 4 }}>
            [{message.media_type}{message.media_mimetype ? ` ${message.media_mimetype}` : ''}]
          </div>
        ) : null}
        {message.content}
        <div style={{ marginTop: 4, fontSize: 10, color: '#888', textAlign: 'right' }}>
          {message.role}
          {' · '}
          {new Date(message.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
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
