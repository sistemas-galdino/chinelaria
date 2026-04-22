/**
 * Tipos parciais do payload de webhook do Evolution API v2.
 * Cobre `messages.upsert` (única que processamos por enquanto).
 */

export interface EvolutionWebhookPayload {
  event: string;
  instance: string;
  data?: EvolutionMessageData;
  date_time?: string;
  sender?: string;
  apikey?: string;
}

export interface EvolutionMessageData {
  key: EvolutionMessageKey;
  pushName?: string;
  status?: string;
  message?: EvolutionMessageContent;
  messageType?: string;
  messageTimestamp?: number;
  instanceId?: string;
  source?: string;
}

export interface EvolutionMessageKey {
  remoteJid: string;
  fromMe: boolean;
  id: string;
  participant?: string;
}

export interface EvolutionMessageContent {
  conversation?: string;
  extendedTextMessage?: { text: string };
  imageMessage?: EvolutionMediaMessage & { caption?: string };
  audioMessage?: EvolutionMediaMessage;
  videoMessage?: EvolutionMediaMessage & { caption?: string };
  documentMessage?: EvolutionMediaMessage;
  stickerMessage?: EvolutionMediaMessage;
}

export interface EvolutionMediaMessage {
  url?: string;
  mimetype?: string;
  fileSha256?: string;
  fileLength?: string;
  mediaKey?: string;
  base64?: string;
}
