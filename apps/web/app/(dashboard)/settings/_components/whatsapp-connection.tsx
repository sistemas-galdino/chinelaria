'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { Pill } from '@/components/ui/pill';
import { clsx } from '@/lib/clsx';

type ConnectionState = 'open' | 'connecting' | 'close';

type StatusData = {
  instanceName: string;
  state: ConnectionState;
  owner: string | null;
  ownerNumber: string | null;
  profileName: string | null;
  profilePictureUrl: string | null;
};

type QRData = {
  alreadyConnected: boolean;
  base64: string | null;
  pairingCode: string | null;
  count: number | null;
};

type ActionMsg = { kind: 'ok' | 'err'; text: string };

export function WhatsAppConnection({ instanceName }: { instanceName: string }) {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  const [qrOpen, setQrOpen] = useState(false);
  const [qr, setQr] = useState<QRData | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);

  const [pending, startTransition] = useTransition();
  const [actionMsg, setActionMsg] = useState<ActionMsg | null>(null);

  const cancelRef = useRef(false);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  const fetchStatus = useCallback(async (): Promise<StatusData | null> => {
    try {
      const res = await fetch('/api/whatsapp/status', { cache: 'no-store' });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        setStatusError(body.message ?? `Erro ${res.status}`);
        return null;
      }
      const data = (await res.json()) as StatusData;
      setStatus(data);
      setStatusError(null);
      return data;
    } catch {
      setStatusError('Erro de conexão com Evolution');
      return null;
    } finally {
      setStatusLoading(false);
    }
  }, []);

  // Polling status — 5s, pula em hidden tab
  useEffect(() => {
    cancelRef.current = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function tick() {
      if (cancelRef.current) return;
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        timer = setTimeout(tick, 5000);
        return;
      }
      await fetchStatus();
      if (!cancelRef.current) timer = setTimeout(tick, 5000);
    }

    tick();

    function onVis() {
      if (document.visibilityState === 'visible') {
        if (timer) clearTimeout(timer);
        tick();
      }
    }
    document.addEventListener('visibilitychange', onVis);

    return () => {
      cancelRef.current = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [fetchStatus]);

  // Polling QR — 3s só quando modal aberto
  useEffect(() => {
    if (!qrOpen) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function tick() {
      if (cancelled) return;
      try {
        const res = await fetch('/api/whatsapp/qrcode', { cache: 'no-store' });
        if (!res.ok) {
          setQrError('Não foi possível gerar QR');
        } else {
          const data = (await res.json()) as QRData;
          if (data.alreadyConnected) {
            setQrOpen(false);
            setQr(null);
            void fetchStatus();
            return;
          }
          setQr(data);
          setQrError(null);
        }
      } catch {
        setQrError('Erro de conexão');
      } finally {
        if (!cancelled && qrOpen) timer = setTimeout(tick, 3000);
      }
    }
    tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [qrOpen, fetchStatus]);

  // Auto-close defensivo: status virou 'open' enquanto modal aberto
  useEffect(() => {
    if (qrOpen && status?.state === 'open') {
      setQrOpen(false);
      setQr(null);
    }
  }, [qrOpen, status?.state]);

  // Reset QR state quando fecha
  useEffect(() => {
    if (!qrOpen) {
      setQr(null);
      setQrError(null);
    }
  }, [qrOpen]);

  // Body scroll lock + Escape no modal (mobile)
  useEffect(() => {
    if (!qrOpen) return;
    const isDesktop =
      typeof window !== 'undefined' &&
      window.matchMedia('(min-width: 1024px)').matches;
    let prevOverflow = '';
    if (!isDesktop) {
      prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setQrOpen(false);
    }
    window.addEventListener('keydown', onKey);
    // Focus close button
    requestAnimationFrame(() => closeBtnRef.current?.focus());
    return () => {
      if (!isDesktop) document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [qrOpen]);

  // Auto-dismiss actionMsg
  useEffect(() => {
    if (!actionMsg) return;
    const t = setTimeout(() => setActionMsg(null), 3500);
    return () => clearTimeout(t);
  }, [actionMsg]);

  function handleConnect() {
    setQrOpen(true);
  }

  function handleRestart() {
    startTransition(async () => {
      try {
        const res = await fetch('/api/whatsapp/restart', { method: 'POST' });
        if (res.ok) {
          setActionMsg({ kind: 'ok', text: 'Instância reiniciada.' });
          // refetch após 1s pra capturar transição de estado
          setTimeout(() => void fetchStatus(), 1000);
        } else {
          setActionMsg({ kind: 'err', text: 'Falha ao reiniciar.' });
        }
      } catch {
        setActionMsg({ kind: 'err', text: 'Erro de conexão.' });
      }
    });
  }

  function handleLogoutAndConnect() {
    startTransition(async () => {
      try {
        await fetch('/api/whatsapp/logout', { method: 'POST' });
        setActionMsg({ kind: 'ok', text: 'Sessão encerrada.' });
        setQrOpen(true);
        void fetchStatus();
      } catch {
        setActionMsg({ kind: 'err', text: 'Falha ao desconectar.' });
      }
    });
  }

  return (
    <>
      <section className="rounded-card border border-sand-200 bg-paper-soft shadow-soft p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <h2 className="font-serif text-[20px] sm:text-[22px] text-ink leading-tight">
              Conexão WhatsApp
            </h2>
            <p className="text-[12px] text-ink-muted mt-0.5">
              Instância · <span className="font-mono text-ink-soft">{instanceName}</span>
            </p>
          </div>
          <StatusPill state={status?.state ?? null} loading={statusLoading} hasError={!!statusError} />
        </div>

        {statusError ? (
          <div className="mb-4 rounded-card border border-terracotta-500/30 bg-terracotta-50 px-4 py-3 text-[13px] text-terracotta-700 flex items-start justify-between gap-3 flex-wrap">
            <span>{statusError}</span>
            <button
              type="button"
              onClick={() => {
                setStatusLoading(true);
                void fetchStatus();
              }}
              className="text-terracotta-700 underline hover:no-underline whitespace-nowrap"
            >
              Tentar novamente
            </button>
          </div>
        ) : null}

        {status?.state === 'open' ? (
          <div className="flex items-center gap-3 mb-5 p-3 -mx-1 rounded-card bg-sage-100/40 border border-sage-500/15">
            <Avatar
              name={status.profileName}
              phone={status.ownerNumber ?? status.instanceName}
              size="lg"
            />
            <div className="min-w-0">
              <div className="font-serif text-[16px] text-ink truncate">
                {status.profileName ?? 'WhatsApp conectado'}
              </div>
              <div className="text-[12px] text-ink-muted tabular-nums">
                {status.ownerNumber ? formatPhone(status.ownerNumber) : '—'}
              </div>
            </div>
          </div>
        ) : null}

        {status?.state === 'connecting' ? (
          <p className="text-[13px] text-ink-muted mb-5 leading-relaxed">
            Conectando ao WhatsApp… Pode levar alguns segundos.
          </p>
        ) : null}

        {status?.state === 'close' ? (
          <p className="text-[13px] text-ink-muted mb-5 leading-relaxed">
            Nenhum número conectado. Clique em <strong className="text-ink">Conectar</strong> para
            escanear o QR code.
          </p>
        ) : null}

        {!status && !statusError ? (
          <div className="mb-5 h-12 rounded-lg bg-sand-200/40 animate-pulse" />
        ) : null}

        <div className="flex flex-wrap gap-2">
          {status?.state === 'close' ? (
            <PrimaryButton onClick={handleConnect} disabled={pending}>
              <QrIcon /> Conectar
            </PrimaryButton>
          ) : null}
          {status?.state === 'open' ? (
            <>
              <SecondaryButton onClick={handleRestart} disabled={pending}>
                <RefreshIcon /> Reconectar
              </SecondaryButton>
              <DangerButton onClick={handleLogoutAndConnect} disabled={pending}>
                <SwapIcon /> Trocar número
              </DangerButton>
            </>
          ) : null}
          {status?.state === 'connecting' ? (
            <SecondaryButton onClick={handleRestart} disabled={pending}>
              <RefreshIcon /> Reiniciar
            </SecondaryButton>
          ) : null}
        </div>

        {actionMsg ? (
          <p
            className={clsx(
              'mt-3 text-[12px] animate-fade-in',
              actionMsg.kind === 'ok' ? 'text-sage-700' : 'text-terracotta-700',
            )}
          >
            {actionMsg.text}
          </p>
        ) : null}
      </section>

      {/* QR Modal */}
      <div
        data-open={qrOpen || undefined}
        onClick={() => setQrOpen(false)}
        aria-hidden={!qrOpen}
        className={clsx(
          'fixed inset-0 z-30 bg-ink/50 opacity-0 pointer-events-none transition-opacity duration-300',
          'data-[open]:opacity-100 data-[open]:pointer-events-auto',
        )}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="qr-title"
        data-open={qrOpen || undefined}
        className={clsx(
          // Mobile bottom sheet
          'fixed inset-x-0 bottom-0 z-40 max-h-[90dvh] overflow-y-auto',
          'bg-paper-soft border-t border-sand-200 shadow-paper rounded-t-3xl',
          'translate-y-full data-[open]:translate-y-0 transition-transform duration-300 ease-out',
          // Desktop dialog centralizado
          'lg:bottom-auto lg:top-1/2 lg:left-1/2 lg:right-auto lg:inset-auto lg:-translate-x-1/2 lg:-translate-y-1/2 data-[open]:lg:-translate-y-1/2',
          'lg:w-[440px] lg:rounded-card lg:border lg:max-h-[90vh]',
          // Visibilidade: escondido por padrão (desktop precisa disso porque os translates do lg sobrescrevem o translate-y-full do mobile)
          'opacity-0 invisible pointer-events-none transition-[opacity,visibility] duration-200',
          'data-[open]:opacity-100 data-[open]:visible data-[open]:pointer-events-auto',
        )}
      >
        {/* Drag handle (mobile only) */}
        <div className="lg:hidden pt-2.5 pb-1 flex justify-center">
          <div className="h-1.5 w-12 rounded-full bg-sand-300" />
        </div>

        <div className="px-5 sm:px-6 pt-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] lg:pb-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 id="qr-title" className="font-serif text-[20px] sm:text-[22px] text-ink leading-tight">
                Conectar WhatsApp
              </h2>
              <p className="text-[12px] text-ink-muted mt-1">
                Escaneie o QR code com o seu celular
              </p>
            </div>
            <button
              ref={closeBtnRef}
              type="button"
              onClick={() => setQrOpen(false)}
              aria-label="Fechar"
              className="size-8 grid place-items-center rounded-full hover:bg-sand-200/60 text-ink-muted hover:text-ink transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-terracotta-500/40"
            >
              <CloseIcon />
            </button>
          </div>

          <ol className="text-[12.5px] text-ink-muted leading-relaxed mb-5 space-y-1.5 list-decimal list-inside marker:text-terracotta-500 marker:font-medium">
            <li>Abra o WhatsApp no seu celular</li>
            <li>Toque em <strong className="text-ink">Aparelhos conectados</strong></li>
            <li>Toque em <strong className="text-ink">Conectar um aparelho</strong></li>
            <li>Aponte a câmera para o código abaixo</li>
          </ol>

          {qrError ? (
            <div className="mb-4 rounded-card border border-terracotta-500/30 bg-terracotta-50 px-4 py-3 text-[13px] text-terracotta-700">
              {qrError}
            </div>
          ) : null}

          <div className="grid place-items-center mb-4">
            {qr?.base64 ? (
              <img
                src={qr.base64}
                alt="QR Code para conectar WhatsApp"
                className="block rounded-card border border-sand-200 bg-paper p-2 max-w-[260px] sm:max-w-[280px] w-full animate-scale-in"
              />
            ) : (
              <div className="grid place-items-center size-[260px] sm:size-[280px] rounded-card border border-sand-200 bg-paper">
                <SpinnerIcon />
              </div>
            )}
          </div>

          {qr?.pairingCode ? (
            <div className="mb-4 text-center">
              <p className="text-[10.5px] uppercase tracking-[0.12em] text-ink-muted font-medium mb-2">
                Ou digite este código no celular
              </p>
              <span className="font-mono text-[22px] sm:text-[26px] tracking-[0.25em] tabular-nums text-ink select-all">
                {qr.pairingCode}
              </span>
            </div>
          ) : null}

          <div className="flex justify-end">
            <SecondaryButton onClick={() => setQrOpen(false)}>Cancelar</SecondaryButton>
          </div>
        </div>
      </div>
    </>
  );
}

/* ---------- StatusPill ---------- */

function StatusPill({
  state,
  loading,
  hasError,
}: {
  state: ConnectionState | null;
  loading: boolean;
  hasError: boolean;
}) {
  if (hasError) {
    return (
      <Pill variant="unread" dot>
        erro
      </Pill>
    );
  }
  if (loading || !state) {
    return <Pill variant="neutral">carregando</Pill>;
  }
  switch (state) {
    case 'open':
      return (
        <Pill variant="agent-active" dot>
          conectado
        </Pill>
      );
    case 'connecting':
      return (
        <Pill variant="paused" dot>
          conectando
        </Pill>
      );
    case 'close':
    default:
      return (
        <Pill variant="unread" dot>
          desconectado
        </Pill>
      );
  }
}

/* ---------- Buttons ---------- */

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode };

function PrimaryButton({ className, children, ...props }: BtnProps) {
  return (
    <button
      type="button"
      {...props}
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full bg-terracotta-500 text-paper px-4 py-2 text-[13px] font-medium',
        'hover:bg-terracotta-600 active:scale-[0.98] transition-all duration-150',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-terracotta-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-paper-soft',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
        className,
      )}
    >
      {children}
    </button>
  );
}

function SecondaryButton({ className, children, ...props }: BtnProps) {
  return (
    <button
      type="button"
      {...props}
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border border-sand-300 bg-paper text-ink px-4 py-2 text-[13px] font-medium',
        'hover:bg-sand-100 transition-colors duration-150',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-terracotta-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-paper-soft',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className,
      )}
    >
      {children}
    </button>
  );
}

function DangerButton({ className, children, ...props }: BtnProps) {
  return (
    <button
      type="button"
      {...props}
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border border-terracotta-500/30 bg-terracotta-50 text-terracotta-700 px-4 py-2 text-[13px] font-medium',
        'hover:bg-terracotta-100 transition-colors duration-150',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-terracotta-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-paper-soft',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className,
      )}
    >
      {children}
    </button>
  );
}

/* ---------- Helpers ---------- */

function formatPhone(digits: string): string {
  const m = digits.match(/^(\d{2})(\d{2})(\d{4,5})(\d{4})$/);
  if (!m) return `+${digits}`;
  return `+${m[1]} ${m[2]} ${m[3]}-${m[4]}`;
}

/* ---------- Icons ---------- */

function QrIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3.5"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h2v2h-2zM18 14h3M14 18h2v3M18 18h3v3" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3.5"
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 1 1-3.5-7.1" />
      <path d="M21 4v6h-6" />
    </svg>
  );
}

function SwapIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3.5"
      aria-hidden="true"
    >
      <path d="M7 4 3 8l4 4" />
      <path d="M3 8h13a4 4 0 0 1 4 4" />
      <path d="m17 20 4-4-4-4" />
      <path d="M21 16H8a4 4 0 0 1-4-4" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
      aria-hidden="true"
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="size-7 animate-spin text-ink-muted"
      aria-label="Carregando"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.2" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
