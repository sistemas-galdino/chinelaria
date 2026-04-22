/**
 * Compõe o system prompt final injetando o perfil do cliente
 * em um bloco no topo (antes do prompt mestre).
 */

export interface CustomerProfileSummary {
  phoneNumber: string;
  displayName: string | null;
  sizePref: string | null;
  brandPrefs: string[];
  notes: string | null;
}

export function buildSystemPrompt(masterPrompt: string, profile: CustomerProfileSummary): string {
  const lines: string[] = [];
  lines.push('## Contexto sobre o cliente atual');
  if (profile.displayName) lines.push(`- Nome: ${profile.displayName}`);
  lines.push(`- Telefone: ${profile.phoneNumber}`);
  if (profile.sizePref) lines.push(`- Tamanho que costuma calçar: ${profile.sizePref}`);
  if (profile.brandPrefs.length) lines.push(`- Marcas favoritas: ${profile.brandPrefs.join(', ')}`);
  if (profile.notes) lines.push(`- Anotações: ${profile.notes}`);
  lines.push('');
  lines.push('Use essas informações com naturalidade — não recite, mas personalize a resposta.');
  lines.push('');
  lines.push('---');
  lines.push('');
  return `${lines.join('\n')}${masterPrompt}`;
}
