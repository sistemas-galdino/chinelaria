import type { ReactNode } from 'react';

export const metadata = {
  title: 'Chinelaria — Atendimento',
  description: 'Painel de atendimento WhatsApp com IA',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
