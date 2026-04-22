/**
 * Gera o slug correto para a URL pública do produto a partir do nome da derivação.
 * Remove o sufixo de tamanho ` (37)`, normaliza acentos e troca não-alfanumérico por hífen.
 * Mantém comportamento idêntico aos workflows n8n originais.
 */
export function makeSlug(nomeDerivacao: string): string {
  const semTam = nomeDerivacao
    .replace(/\s+(\d+(\/\d+)?(\s+un)?|un)\)\s*$/i, ')')
    .replace(/[()]/g, ' ');
  return semTam
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Extrai a cor de uma `descricaoProduto` no formato "Modelo - DerivCor (37)".
 */
export function extractCor(desc: string): string {
  const parte = desc.split(' - ').slice(1).join(' - ') || desc;
  const m = parte.match(/\(([^)]+)\)/);
  if (!m) return '';
  let cor = m[1] ?? '';
  cor = cor.replace(/\s+\d+(\/\d+)?(\s+un)?\s*$/i, '').replace(/\s+un\s*$/i, '');
  cor = cor.replace(/^\d+\s+/, '').trim();
  return cor;
}

/**
 * Verifica se uma `descricaoProduto` corresponde ao tamanho informado.
 * Aceita variações como "37", "35/36" — sempre com parênteses no fim ou espaço antes.
 */
export function matchesTamanho(desc: string, tamanho: string): boolean {
  const esc = tamanho.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(\\s|\\()${esc}(\\s+un)?\\s*\\)`);
  return re.test(desc);
}
