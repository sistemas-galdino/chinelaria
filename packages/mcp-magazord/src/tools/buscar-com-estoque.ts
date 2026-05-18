import { z } from 'zod';
import type { MagazordClient } from '../magazord-client.ts';
import type { MagazordConfig } from '../config.ts';
import { extractCor, makeSlug, matchesTamanho } from '../slug.ts';
import { detectCategoria, pathDoTipo, tamanhoFamilyIds } from '../maps.ts';

export const buscarComEstoqueInput = z.object({
  tipo: z
    .string()
    .min(1)
    .describe(
      'Tipo de produto: sandalia, chinelo, tenis, bota, etc. Pode incluir marca: havaianas, modare, vizzano',
    ),
  tamanho: z
    .string()
    .min(1)
    .describe('Numero de calçado: 37, 38, 35/36, 39/40'),
});

export type BuscarComEstoqueInput = z.infer<typeof buscarComEstoqueInput>;

export interface BuscarComEstoqueProduto {
  nome: string;
  cor: string;
  quantidade: number;
  sku: string;
  link: string;
}

export interface BuscarComEstoqueOutput {
  encontrados: number;
  tamanho: string;
  link_filtrado: string;
  categoria_detectada?: string;
  produtos?: BuscarComEstoqueProduto[];
  mensagem?: string;
}

function linkCategoriaFiltrada(
  config: MagazordConfig,
  tipo: string,
  tamanho: string,
  categoriaId?: number,
): string {
  let path = pathDoTipo(tipo);
  // As 4 categorias conhecidas (dedo/papete/rasteirinha/slide) vivem todas em /chinelo
  if (!path && categoriaId) path = 'chinelo';
  const base = `${config.storeUrl}/${path}`;
  const params: string[] = [];
  // Família de tamanhos: pedir 35 inclui também 35/36, pedir 36 inclui 35/36 também, etc.
  const ids = tamanhoFamilyIds(tamanho);
  if (ids.length > 0) params.push(`derivacao=${ids.join(',')}`);
  if (categoriaId) params.push(`categoria=${categoriaId}`);
  return params.length ? `${base}?${params.join('&')}` : base;
}

/**
 * REGRA DE OURO: tipo + tamanho ⇒ produtos COM estoque real no tamanho informado.
 *
 * Estratégia:
 *   1. GET `/api/v2/site/produtoDerivacoes?nome={tipo}` — descobre pais por categoria/nome.
 *      (Substitui o filtro `nomeDerivacao like "{tipo} {tamanho}"` original, que falhava
 *      porque `nomeDerivacao` contém só nome+cor+tamanho, sem a categoria.)
 *   2. Extrai pais únicos via `agrupador`.
 *   3. Para cada pai, GET `/api/v1/listEstoque?produtoPai={codigoPai}`.
 *   4. Filtra derivações no tamanho pedido com `quantidadeDisponivelVenda > 0`.
 *   5. Agrupa por (modelo, cor) e devolve até 10 itens.
 */
export async function buscarComEstoque(
  client: MagazordClient,
  config: MagazordConfig,
  input: BuscarComEstoqueInput,
): Promise<BuscarComEstoqueOutput> {
  const tipo = input.tipo.trim();
  const tamanho = String(input.tamanho).trim();

  // Detecta categoria estilo (dedo/slide/papete/rasteirinha) — Magazord não indexa isso no nome,
  // então removemos a palavra do search e enviamos categoria no link_filtrado.
  const categoria = detectCategoria(tipo);
  const linkFiltrado = linkCategoriaFiltrada(config, tipo, tamanho, categoria?.id);
  const searchNome = (() => {
    if (!categoria) return tipo;
    const stripped = tipo.replace(new RegExp(`\\b${categoria.word}\\b`, 'gi'), '').trim();
    return stripped || 'chinelo';
  })();

  console.log(
    `[buscar-com-estoque] start tipo="${tipo}" tamanho="${tamanho}"` +
      (categoria ? ` categoria=${categoria.word}(${categoria.id}) searchNome="${searchNome}"` : ''),
  );

  const derivRes = await client.produtoDerivacoes(searchNome, 50);
  const derivItems = derivRes.data?.items ?? [];

  const pais = new Map<string, { codigoPai: string; nome: string; marca: string }>();
  for (const it of derivItems) {
    const agrup = it.agrupador || it.codigo;
    if (!agrup) continue;
    const codigoPai = String(agrup).split('-')[0] ?? String(agrup);
    if (pais.has(codigoPai)) continue;
    pais.set(codigoPai, {
      codigoPai,
      nome: it.nomeCompleto ? (it.nomeCompleto.split(' - ')[0] ?? it.nome) : it.nome,
      marca: '',
    });
  }

  console.log(`[buscar-com-estoque] phase1: ${pais.size} parents found (${derivItems.length} deriv rows)`);

  if (pais.size === 0) {
    return {
      encontrados: 0,
      tamanho,
      link_filtrado: linkFiltrado,
      ...(categoria ? { categoria_detectada: categoria.word } : {}),
      mensagem: `Nenhum produto encontrado no tamanho ${tamanho} com estoque no momento.`,
    };
  }

  const estoquesPorPai = await Promise.all(
    Array.from(pais.values()).map(async (p) => {
      try {
        const estoque = await client.listEstoque(p.codigoPai, 100);
        return { pai: p, estoque: estoque.data ?? [] };
      } catch (err) {
        console.log(
          `[buscar-com-estoque] listEstoque failed for pai=${p.codigoPai}: ${(err as Error).message}`,
        );
        return { pai: p, estoque: [] };
      }
    }),
  );

  const totalEstoqueRows = estoquesPorPai.reduce((sum, x) => sum + x.estoque.length, 0);
  console.log(`[buscar-com-estoque] phase2: ${totalEstoqueRows} estoque rows across ${pais.size} parents`);

  const grupos = new Map<string, BuscarComEstoqueProduto>();
  let droppedQty = 0;
  let droppedSize = 0;

  for (const { estoque } of estoquesPorPai) {
    if (estoque.length === 0) continue;
    const primeiroDesc = estoque[0]?.descricaoProduto ?? '';
    const nomePai = primeiroDesc.split(' - ')[0] ?? '';

    for (const e of estoque) {
      const qtd = e.quantidadeDisponivelVenda || 0;
      if (qtd <= 0) {
        droppedQty++;
        continue;
      }
      const desc = e.descricaoProduto ?? '';
      // Família: cliente pedindo "35" também deve casar SKU "(35/36)", e vice-versa.
      const sizeParts = tamanho.includes('/') ? tamanho.split('/') : [tamanho];
      if (!sizeParts.some((s) => matchesTamanho(desc, s))) {
        droppedSize++;
        continue;
      }

      const nomeDerivacao = desc.split(' - ').slice(1).join(' - ') || desc;
      const slug = makeSlug(nomeDerivacao);
      const cor = extractCor(desc);
      const chave = `${nomePai}|${cor}`;

      const existing = grupos.get(chave);
      if (existing) {
        existing.quantidade += qtd;
      } else {
        grupos.set(chave, {
          nome: nomePai,
          cor,
          quantidade: qtd,
          sku: e.produto,
          link: `${config.storeUrl}/${slug}`,
        });
      }
    }
  }

  const produtos = Array.from(grupos.values()).slice(0, 10);
  console.log(
    `[buscar-com-estoque] phase3: dropped ${droppedQty} qty<=0, dropped ${droppedSize} wrong size, matched ${produtos.length} groups`,
  );

  if (produtos.length === 0) {
    return {
      encontrados: 0,
      tamanho,
      link_filtrado: linkFiltrado,
      ...(categoria ? { categoria_detectada: categoria.word } : {}),
      mensagem: `Nenhum produto encontrado no tamanho ${tamanho} com estoque no momento.`,
    };
  }

  return {
    encontrados: produtos.length,
    tamanho,
    link_filtrado: linkFiltrado,
    ...(categoria ? { categoria_detectada: categoria.word } : {}),
    produtos,
  };
}
