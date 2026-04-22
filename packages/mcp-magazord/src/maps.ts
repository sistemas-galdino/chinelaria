/**
 * derivacaoItemId por tamanho — usado para montar URL de categoria filtrada
 * (ex: `.../sandalia?derivacao=136` filtra a categoria pelo tamanho 37).
 *
 * Mantido idêntico ao workflow n8n `Magazord - Buscar Com Estoque`.
 */
export const TAMANHO_ID: Record<string, number> = {
  '15': 167, '16': 170, '17': 171, '17/18': 110, '18': 172, '19': 109,
  '20': 111, '20/21': 153, '21': 108, '22': 112, '23': 173, '23/24': 81,
  '24': 174, '25': 151, '25/26': 80, '26': 176, '26/27': 152, '27': 175,
  '28': 157, '29': 155, '29/30': 82, '30': 156, '31': 159, '32': 158,
  '32/33': 204, '33': 131, '33/34': 78, '34': 134, '35': 132, '35/36': 87,
  '36': 137, '37': 136, '37/38': 86, '38': 138, '39/40': 89, '41': 161,
  '41/42': 88, '42': 160, '43/44': 114, '44/45': 274, '45/46': 116,
  '46/47': 208, '47/48': 128, UN: 84, und: 3698,
};

/** Termo do tipo (sandalia/chinelo/...) → path da categoria no site. */
export const TIPO_PATH: Record<string, string> = {
  sandalia: 'sandalia', sandália: 'sandalia',
  chinelo: 'chinelo',
  tenis: 'tenis-feminino', tênis: 'tenis-feminino',
  bota: 'bota', sapatilha: 'sapatilha',
  tamanco: 'tamanco', papete: 'papete',
  rasteirinha: 'rasteirinha',
};

export function pathDoTipo(tipo: string): string {
  const tl = tipo.toLowerCase();
  for (const k of Object.keys(TIPO_PATH)) {
    if (tl.includes(k)) return TIPO_PATH[k]!;
  }
  return '';
}
