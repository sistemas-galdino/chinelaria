/**
 * Cliente HTTP outbound para a Evolution API.
 * Usado por:
 *   - resposta do agente (LangGraph) — Fase 4
 *   - resposta humana via dashboard — Fase 5
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

async function evolutionPost<T>(path: string, body: unknown, config?: EvolutionConfig): Promise<T> {
  const cfg = config ?? getEvolutionConfig();
  const res = await fetch(`${cfg.baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: cfg.apiKey,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Evolution ${res.status} ${res.statusText} on ${path}: ${text.slice(0, 300)}`);
  }
  return (await res.json()) as T;
}

/** Envia texto puro para um número WhatsApp. */
export async function sendText(
  phoneNumber: string,
  text: string,
  options?: { delay?: number; presence?: 'composing' | 'recording'; config?: EvolutionConfig },
): Promise<unknown> {
  const cfg = options?.config ?? getEvolutionConfig();
  return evolutionPost(
    `/message/sendText/${encodeURIComponent(cfg.instance)}`,
    {
      number: phoneNumber,
      text,
      ...(options?.delay ? { delay: options.delay } : {}),
      ...(options?.presence ? { presence: options.presence } : {}),
    },
    cfg,
  );
}

/** Faz download bruto de uma media URL retornada no webhook (auth via apikey header). */
export async function downloadMedia(mediaUrl: string, config?: EvolutionConfig): Promise<ArrayBuffer> {
  const cfg = config ?? getEvolutionConfig();
  const res = await fetch(mediaUrl, { headers: { apikey: cfg.apiKey } });
  if (!res.ok) throw new Error(`Evolution media download failed: ${res.status}`);
  return await res.arrayBuffer();
}
