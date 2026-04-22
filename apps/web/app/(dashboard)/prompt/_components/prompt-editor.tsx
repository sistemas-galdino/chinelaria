'use client';

import { useState } from 'react';
import type { AgentPrompt } from '@chinelaria/db';

export default function PromptEditor({
  active,
  saveAction,
}: {
  active: AgentPrompt | null;
  saveAction: (fd: FormData) => Promise<void>;
}) {
  const [content, setContent] = useState(active?.content ?? '');
  const [label, setLabel] = useState('');
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData(e.currentTarget);
      await saveAction(fd);
      setLabel('');
    } finally {
      setSaving(false);
    }
  }

  const dirty = content !== (active?.content ?? '');

  return (
    <form onSubmit={onSubmit} style={{ display: 'grid', gap: 8 }}>
      <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
        Rótulo da nova versão (opcional)
        <input
          name="label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="ex: v2 - tom mais informal"
          style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #ddd', fontSize: 14 }}
        />
      </label>
      <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
        Conteúdo
        <textarea
          name="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={28}
          spellCheck={false}
          style={{
            padding: 12,
            borderRadius: 8,
            border: '1px solid #ddd',
            fontFamily: 'ui-monospace, SFMono-Regular, monospace',
            fontSize: 13,
            lineHeight: 1.45,
            resize: 'vertical',
          }}
        />
      </label>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button
          type="submit"
          disabled={!dirty || saving || !content.trim()}
          style={{
            padding: '8px 14px',
            borderRadius: 6,
            border: 'none',
            background: !dirty || !content.trim() ? '#aaa' : '#111',
            color: '#fff',
            fontSize: 14,
            cursor: !dirty || !content.trim() ? 'not-allowed' : 'pointer',
          }}
        >
          {saving ? 'Salvando…' : 'Salvar como nova versão e ativar'}
        </button>
        <span style={{ fontSize: 12, color: '#888' }}>
          {dirty ? 'Há alterações não salvas.' : 'Sincronizado com o ativo.'} {content.length} chars.
        </span>
      </div>
    </form>
  );
}
