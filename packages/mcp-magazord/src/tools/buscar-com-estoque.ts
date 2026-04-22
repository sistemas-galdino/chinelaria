import { z } from 'zod';
import type { MagazordClient } from '../magazord-client.ts';
import type { MagazordConfig } from '../config.ts';
import { extractCor, makeSlug, matchesTamanho } from '../slug.ts';
import { TAMANHO_ID, pathDoTipo } from '../maps.ts';

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
  produtos?: BuscarComEstoqueProduto[];
  mensagem?: string;
}

function linkCategoriaFiltrada(config: MagazordConfig, tipo: string, tamanho: string): string {
  const path = pathDoTipo(tipo);
  const base = `${config.storeUrl}/${path}`;
  const id = TAMANHO_ID[tamanho];
  if (!id) return base;
  return `${base}?derivacao=${id}`;
}

/**
 * REGRA DE OURO: tipo + tamanho ⇒ produtos COM estoque real no tamanho informado.
 *
 * Estratégia (idêntica ao workflow n8n original):
 *   1. POST `/api/v3/produtos/query` com filtro `nomeDerivacao like "{tipo} {tamanho}"`.
 *   2. Extrai a lista única de `codigoProduto` (pais).
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
  const linkFiltrado = linkCategoriaFiltrada(config, tipo, tamanho);

  const queryRes = await client.produtosQuery(
    [{ field: 'nomeDerivacao', operator: 'like', value: `${tipo} ${tamanho}`.trim() }],
    50,
  );
  const items = queryRes.items ?? [];
  if (items.length === 0) {
    return {
      encontrados: 0,
      tamanho,
      link_filtrado: linkFiltrado,
      mensagem: `Nenhum produto encontrado no tamanho ${tamanho} com estoque no momento.`,
    };
  }

  const pais = new Map<string, { codigoPai: string; nome: string; marca: string }>();
  for (const it of items) {
    const codigo = it.codigoProduto;
    if (!codigo || pais.has(String(codigo))) continue;
    pais.set(String(codigo), {
      codigoPai: String(codigo),
      nome: it.nomeProduto || '',
      marca: it.nomeMarca || '',
    });
  }

  const estoquesPorPai = await Promise.all(
    Array.from(pais.values()).map(async (p) => {
      try {
        const estoque = await client.listEstoque(p.codigoPai, 100);
        return { pai: p, estoque: estoque.data ?? [] };
      } catch {
        return { pai: p, estoque: [] };
      }
    }),
  );

  const grupos = new Map<string, BuscarComEstoqueProduto>();

  for (const { estoque } of estoquesPorPai) {
    if (estoque.length === 0) continue;
    const primeiroDesc = estoque[0]?.descricaoProduto ?? '';
    const nomePai = primeiroDesc.split(' - ')[0] ?? '';

    for (const e of estoque) {
      const qtd = e.quantidadeDisponivelVenda || 0;
      if (qtd <= 0) continue;
      const desc = e.descricaoProduto ?? '';
      if (!matchesTamanho(desc, tamanho)) continue;

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

  if (produtos.length === 0) {
    return {
      encontrados: 0,
      tamanho,
      link_filtrado: linkFiltrado,
      mensagem: `Nenhum produto encontrado no tamanho ${tamanho} com estoque no momento.`,
    };
  }

  return {
    encontrados: produtos.length,
    tamanho,
    link_filtrado: linkFiltrado,
    produtos,
  };
}
