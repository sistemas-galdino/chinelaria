import type { NormalizedInboundMessage, MediaType } from '@chinelaria/shared';
import type { EvolutionMessageData, EvolutionWebhookPayload } from './types.ts';

/**
 * `5511999999999@s.whatsapp.net` → `5511999999999`
 * Retorna null se for grupo (`@g.us`) ou broadcast.
 */
export function extractPhoneNumber(remoteJid: string): string | null {
  if (!remoteJid.endsWith('@s.whatsapp.net')) return null;
  return remoteJid.replace('@s.whatsapp.net', '');
}

interface NormalizedMedia {
  text: string | null;
  mediaUrl: string | null;
  mediaType: MediaType;
  mediaMimetype: string | null;
}

function normalizeContent(data: EvolutionMessageData): NormalizedMedia {
  const m = data.message;
  if (!m) return { text: null, mediaUrl: null, mediaType: null, mediaMimetype: null };

  if (m.conversation) {
    return { text: m.conversation, mediaUrl: null, mediaType: null, mediaMimetype: null };
  }
  if (m.extendedTextMessage?.text) {
    return { text: m.extendedTextMessage.text, mediaUrl: null, mediaType: null, mediaMimetype: null };
  }
  if (m.imageMessage) {
    return {
      text: m.imageMessage.caption ?? null,
      mediaUrl: m.imageMessage.url ?? null,
      mediaType: 'image',
      mediaMimetype: m.imageMessage.mimetype ?? null,
    };
  }
  if (m.audioMessage) {
    return {
      text: null,
      mediaUrl: m.audioMessage.url ?? null,
      mediaType: 'audio',
      mediaMimetype: m.audioMessage.mimetype ?? null,
    };
  }
  if (m.videoMessage) {
    return {
      text: m.videoMessage.caption ?? null,
      mediaUrl: m.videoMessage.url ?? null,
      mediaType: 'video',
      mediaMimetype: m.videoMessage.mimetype ?? null,
    };
  }
  // documento / sticker → tratamos como texto vazio + media (handoff manual)
  if (m.documentMessage || m.stickerMessage) {
    const media = m.documentMessage ?? m.stickerMessage!;
    return {
      text: null,
      mediaUrl: media.url ?? null,
      mediaType: 'video', // mapeia para handoff (V1)
      mediaMimetype: media.mimetype ?? null,
    };
  }
  return { text: null, mediaUrl: null, mediaType: null, mediaMimetype: null };
}

/**
 * Decide se a mensagem é processável pelo agente.
 * Filtra: enviadas por nós (fromMe), grupos, broadcasts.
 */
export function isProcessable(payload: EvolutionWebhookPayload): payload is EvolutionWebhookPayload & {
  data: EvolutionMessageData;
} {
  if (payload.event !== 'messages.upsert') return false;
  const data = payload.data;
  if (!data) return false;
  if (data.key.fromMe) return false;
  if (!data.key.remoteJid.endsWith('@s.whatsapp.net')) return false;
  return true;
}

export function normalize(payload: EvolutionWebhookPayload): NormalizedInboundMessage | null {
  if (!isProcessable(payload)) return null;
  const data = payload.data;

  const phoneNumber = extractPhoneNumber(data.key.remoteJid);
  if (!phoneNumber) return null;

  const { text, mediaUrl, mediaType, mediaMimetype } = normalizeContent(data);
  if (!text && !mediaUrl) return null;

  return {
    evolutionMessageId: data.key.id,
    phoneNumber,
    pushName: data.pushName ?? null,
    text,
    mediaUrl,
    mediaType,
    mediaMimetype,
    timestamp: data.messageTimestamp ?? Math.floor(Date.now() / 1000),
    raw: payload,
  };
}
