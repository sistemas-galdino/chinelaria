/**
 * Heurísticas pós-resposta para detectar quando o agente sinalizou
 * handoff para humano. Se detectar, o runner pausa a conversa.
 *
 * V1: simples regex no texto da resposta. V2 pode usar function-call
 * dedicado para o LLM declarar intenção de handoff.
 */

const HANDOFF_PATTERNS: Array<{ pattern: RegExp; reason: 'intent_buy' | 'tool_signal' }> = [
  { pattern: /pedir.+(?:pra|para)\s+(?:a\s+)?Leilane/i, reason: 'tool_signal' },
  { pattern: /(?:fotinha|foto)\s+real/i, reason: 'tool_signal' },
  { pattern: /vou\s+separar/i, reason: 'tool_signal' },
  { pattern: /\b(comprar|finalizar|fechar pedido|finaliza[rç])\b/i, reason: 'intent_buy' },
];

export function detectHandoff(assistantText: string): { handoff: boolean; reason?: 'intent_buy' | 'tool_signal' } {
  for (const { pattern, reason } of HANDOFF_PATTERNS) {
    if (pattern.test(assistantText)) return { handoff: true, reason };
  }
  return { handoff: false };
}
