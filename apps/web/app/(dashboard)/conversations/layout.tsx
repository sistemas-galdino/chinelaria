import type { ReactNode } from 'react';
import ConversationListServer from './_components/conversation-list-server';

export const dynamic = 'force-dynamic';

export default function ConversationsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid h-[calc(100dvh-3.5rem)] lg:grid-cols-[360px_1fr]">
      <aside className="hidden lg:block min-h-0 border-r border-sand-200 bg-paper-soft/40">
        <ConversationListServer />
      </aside>
      <section className="min-h-0 min-w-0 overflow-hidden">{children}</section>
    </div>
  );
}
