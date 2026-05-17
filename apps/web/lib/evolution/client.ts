/**
 * Cliente HTTP outbound para a Evolution API v2.
 * Cobre: envio de texto, download de mídia, gestão da instância (status, QR, restart, logout).
 */

export interface EvolutionConfig {
  baseUrl: string;
  apiKey: string;
  instance: string;
}

export function getEvolutionConfig(): EvolutionConfig {
  const baseUrl = process.env.EVOLUTION_BASE_URL;
  const apiKey = process.env.EVOLUTION_API_KEY;
  const instance = process.env.EVOLUTION_INSTANCE ?? 'chinelaria';
  if (!baseUrl) throw new Error('EVOLUTION_BASE_URL is required');
  if (!apiKey) throw new Error('EVOLUTION_API_KEY is required');
  return { baseUrl: baseUrl.replace(/\/$/, ''), apiKey, instance };
}

export type ConnectionState = 'open' | 'connecting' | 'close';

export interface ConnectionStateResponse {
  instance: { instanceName: string; state: ConnectionState };
}

export interface ConnectQRResponse {
  pairingCode?: string | null;
  code?: string;
  base64?: string;
  count?: number;
  instance?: { instanceName: string; state: ConnectionState };
}

export interface RestartResponse {
  instance: { instanceName: string; state: ConnectionState };
}

export interface LogoutResponse {
  status?: string;
  error?: boolean;
  response?: { message?: string };
}

/**
 * Evolution v2 shape — array flat, sem wrapper `instance`.
 * Campos: name, connectionStatus, ownerJid, profileName, profilePicUrl, number?
 */
export interface FetchInstanceItem {
  id?: string;
  name: string;
  connectionStatus?: ConnectionState;
  ownerJid?: string | null;
  profileName?: string | null;
  profilePicUrl?: string | null;
  number?: string | null;
}

export class EvolutionHttpError extends Error {
  constructor(
    public status: number,
    public path: string,
    message: string,
  ) {
    super(message);
    this.name = 'EvolutionHttpError';
  }
}

type Method = 'GET' | 'POST' | 'DELETE' | 'PUT';

async function evolutionRequest<T>(
  method: Method,
  path: string,
  options?: { body?: unknown; config?: EvolutionConfig; signal?: AbortSignal },
): Promise<T> {
  const cfg = options?.config ?? getEvolutionConfig();
  const url = `${cfg.baseUrl}${path}`;
  const init: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json', apikey: cfg.apiKey },
    cache: 'no-store',
    ...(options?.signal ? { signal: options.signal } : {}),
    ...(options?.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
  };

  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, init);
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new EvolutionHttpError(
          res.status,
          path,
          `Evolution ${res.status} ${res.statusText} on ${path}: ${text.slice(0, 300)}`,
        );
      }
      const ct = res.headers.get('content-type') ?? '';
      if (ct.includes('application/json')) {
        return (await res.json()) as T;
      }
      // Some endpoints return empty body
      const txt = await res.text().catch(() => '');
      return (txt ? JSON.parse(txt) : ({} as unknown)) as T;
    } catch (err) {
      lastErr = err;
      if (err instanceof EvolutionHttpError) throw err;
      // Network errors only — retry once
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 500));
        continue;
      }
    }
  }
  throw lastErr;
}

/** Envia texto puro para um número WhatsApp. */
export async function sendText(
  phoneNumber: string,
  text: string,
  options?: { delay?: number; presence?: 'composing' | 'recording'; config?: EvolutionConfig },
): Promise<unknown> {
  const cfg = options?.config ?? getEvolutionConfig();
  return evolutionRequest(
    'POST',
    `/message/sendText/${encodeURIComponent(cfg.instance)}`,
    {
      config: cfg,
      body: {
        number: phoneNumber,
        text,
        ...(options?.delay ? { delay: options.delay } : {}),
        ...(options?.presence ? { presence: options.presence } : {}),
      },
    },
  );
}

/** Faz download bruto de uma media URL retornada no webhook (auth via apikey header). */
export async function downloadMedia(mediaUrl: string, config?: EvolutionConfig): Promise<ArrayBuffer> {
  const cfg = config ?? getEvolutionConfig();
  const res = await fetch(mediaUrl, { headers: { apikey: cfg.apiKey } });
  if (!res.ok) throw new Error(`Evolution media download failed: ${res.status}`);
  return await res.arrayBuffer();
}

/** Retorna o estado atual de conexão da instância. */
export async function getConnectionState(
  config?: EvolutionConfig,
): Promise<ConnectionStateResponse> {
  const cfg = config ?? getEvolutionConfig();
  return evolutionRequest<ConnectionStateResponse>(
    'GET',
    `/instance/connectionState/${encodeURIComponent(cfg.instance)}`,
    { config: cfg },
  );
}

/** Pede QR code (ou estado, se já conectado). */
export async function getConnectQR(config?: EvolutionConfig): Promise<ConnectQRResponse> {
  const cfg = config ?? getEvolutionConfig();
  return evolutionRequest<ConnectQRResponse>(
    'GET',
    `/instance/connect/${encodeURIComponent(cfg.instance)}`,
    { config: cfg },
  );
}

/** Reinicia a instância mantendo a sessão. */
export async function restartInstance(config?: EvolutionConfig): Promise<RestartResponse> {
  const cfg = config ?? getEvolutionConfig();
  return evolutionRequest<RestartResponse>(
    'POST',
    `/instance/restart/${encodeURIComponent(cfg.instance)}`,
    { config: cfg, body: {} },
  );
}

/** Desloga a instância — próximo connect gera novo QR. */
export async function logoutInstance(config?: EvolutionConfig): Promise<LogoutResponse> {
  const cfg = config ?? getEvolutionConfig();
  return evolutionRequest<LogoutResponse>(
    'DELETE',
    `/instance/logout/${encodeURIComponent(cfg.instance)}`,
    { config: cfg },
  );
}

/** Busca metadados da instância (owner, profile, etc). */
export async function fetchInstance(config?: EvolutionConfig): Promise<FetchInstanceItem> {
  const cfg = config ?? getEvolutionConfig();
  const arr = await evolutionRequest<FetchInstanceItem[]>(
    'GET',
    `/instance/fetchInstances?instanceName=${encodeURIComponent(cfg.instance)}`,
    { config: cfg },
  );
  if (!Array.isArray(arr) || arr.length === 0) {
    throw new EvolutionHttpError(404, '/instance/fetchInstances', 'instance not found');
  }
  return arr[0]!;
}
