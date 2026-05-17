import ConversationListServer from './_components/conversation-list-server';

export const dynamic = 'force-dynamic';

export default async function ConversationsPage() {
  return (
    <div className="h-full">
      <div className="lg:hidden h-full">
        <ConversationListServer />
      </div>
      <div className="hidden lg:flex h-full items-center justify-center px-8">
        <div className="text-center max-w-md">
          <div className="mx-auto mb-6 grid place-items-center size-16 rounded-full bg-paper-soft border border-sand-200 shadow-soft">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-7 text-terracotta-500"
              aria-hidden="true"
            >
              <path d="M21 12a9 9 0 0 1-13.5 7.79L3 21l1.21-4.5A9 9 0 1 1 21 12z" />
            </svg>
          </div>
          <h2 className="font-serif text-2xl text-ink mb-2">Selecione uma conversa</h2>
          <p className="text-sm text-ink-muted leading-relaxed">
            Escolha um cliente da lista ao lado para acompanhar a conversa, intervir
            quando precisar e supervisionar o agente.
          </p>
        </div>
      </div>
    </div>
  );
}
