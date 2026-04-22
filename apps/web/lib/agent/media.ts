import 'server-only';
import OpenAI from 'openai';
import { downloadMedia } from '../evolution/client.ts';

const WHISPER_MODEL = process.env.OPENAI_WHISPER_MODEL ?? 'whisper-1';

let openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!openai) {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error('OPENAI_API_KEY is required for media processing');
    openai = new OpenAI({ apiKey: key });
  }
  return openai;
}

/** Faz download da media via Evolution (com auth) e devolve um Buffer. */
async function fetchMediaBuffer(mediaUrl: string): Promise<Buffer> {
  const buf = await downloadMedia(mediaUrl);
  return Buffer.from(buf);
}

/** Transcreve áudio com OpenAI Whisper. Retorna o texto. */
export async function transcribeAudio(mediaUrl: string, mimetype: string | null): Promise<string> {
  const buffer = await fetchMediaBuffer(mediaUrl);
  const ext = guessExt(mimetype) ?? 'ogg';
  const file = new File([new Uint8Array(buffer)], `audio.${ext}`, { type: mimetype ?? 'audio/ogg' });
  const result = await getOpenAI().audio.transcriptions.create({
    file,
    model: WHISPER_MODEL,
    language: 'pt',
  });
  return result.text.trim();
}

/**
 * Devolve um content block multimodal para a HumanMessage do LangChain
 * com a imagem em data URI (base64). Funciona com GPT-5 vision.
 */
export async function buildImageContentBlock(
  mediaUrl: string,
  mimetype: string | null,
): Promise<{ type: 'image_url'; image_url: { url: string; detail: 'auto' } }> {
  const buffer = await fetchMediaBuffer(mediaUrl);
  const mt = mimetype ?? 'image/jpeg';
  const b64 = buffer.toString('base64');
  return {
    type: 'image_url',
    image_url: { url: `data:${mt};base64,${b64}`, detail: 'auto' },
  };
}

function guessExt(mimetype: string | null): string | null {
  if (!mimetype) return null;
  const map: Record<string, string> = {
    'audio/ogg': 'ogg',
    'audio/ogg; codecs=opus': 'ogg',
    'audio/mpeg': 'mp3',
    'audio/mp4': 'm4a',
    'audio/wav': 'wav',
    'audio/webm': 'webm',
  };
  return map[mimetype] ?? mimetype.split('/')[1]?.split(';')[0] ?? null;
}
