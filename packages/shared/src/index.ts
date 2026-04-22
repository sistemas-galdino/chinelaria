export type Role = 'customer' | 'agent' | 'human' | 'system';

export type MediaType = 'image' | 'audio' | 'video' | null;

export interface NormalizedInboundMessage {
  evolutionMessageId: string;
  phoneNumber: string;
  pushName: string | null;
  text: string | null;
  mediaUrl: string | null;
  mediaType: MediaType;
  mediaMimetype: string | null;
  timestamp: number;
  raw: unknown;
}
