import { z } from 'zod';
import type { MagazordClient } from '../magazord-client.ts';
import type { MagazordConfig } from '../config.ts';
import { makeSlug } from '../slug.ts';

export const buscaAvancadaInput = z.object({
  termo: z
    .string()
    .min(1)
    .describe('Termo de busca com cor e/ou tamanho (ex: "havaianas azul 37", "molekinha preto 25")'),
});

export type BuscaAvancadaInput = z.infer<typeof buscaAvancadaInput>;

export interface BuscaAvancadaOutput {
  total: number;
  encontrados: number;
  produtos: Array<{
    nome: string;
    derivacao?: string;
    codigo: string;
    sku?: string;
    marca?: string;
    ativo?: boolean;
    link: string;
  }>;
}

export async function buscaAvancada(
  client: MagazordClient,
  config: MagazordConfig,
  input: BuscaAvancadaInput,
): Promise<BuscaAvancadaOutput | { erro: string }> {
  const data = await client.produtosQuery(
    [{ field: 'nomeDerivacao', operator: 'like', value: input.termo }],
    15,
  );
  if (!Array.isArray(data.items) || data.items.length === 0) {
    return { erro: 'Nenhum produto encontrado' };
  }

  const produtos = data.items.map((item) => {
    const slug = makeSlug(item.nomeDerivacao ?? '');
    return {
      nome: item.nomeProduto,
      derivacao: item.nomeDerivacao,
      codigo: item.codigoProduto,
      sku: item.derivacaoCodigo,
      marca: item.nomeMarca,
      ativo: item.ativo,
      link: `${config.storeUrl}/${slug}`,
    };
  });

  return { total: data.total ?? produtos.length, encontrados: produtos.length, produtos };
}
