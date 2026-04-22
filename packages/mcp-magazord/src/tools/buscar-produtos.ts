import { z } from 'zod';
import type { MagazordClient } from '../magazord-client.ts';
import type { MagazordConfig } from '../config.ts';
import { makeSlug } from '../slug.ts';

export const buscarProdutosInput = z.object({
  nome: z
    .string()
    .min(1)
    .describe('Nome ou palavra-chave do produto (ex: "havaianas", "sandalia", "chinelo feminino")'),
});

export type BuscarProdutosInput = z.infer<typeof buscarProdutosInput>;

export interface BuscarProdutosOutput {
  total: number;
  produtos: Array<{
    nome: string;
    codigo_pai: string;
    tamanhos: string;
    link: string;
  }>;
}

export async function buscarProdutos(
  client: MagazordClient,
  config: MagazordConfig,
  input: BuscarProdutosInput,
): Promise<BuscarProdutosOutput | { erro: string }> {
  const data = await client.produtoDerivacoes(input.nome, 20);
  if (data.status !== 'success' || !data.data?.items?.length) {
    return { erro: 'Nenhum produto encontrado' };
  }

  const grupos: Record<
    string,
    { nome: string; codigo_pai: string; tamanhos: string[]; link: string }
  > = {};

  for (const item of data.data.items) {
    const agrup = item.agrupador || item.codigo;
    if (!grupos[agrup]) {
      const slug = makeSlug(item.nome);
      grupos[agrup] = {
        nome: item.nomeCompleto ? (item.nomeCompleto.split(' - ')[0] ?? item.nome) : item.nome,
        codigo_pai: agrup.split('-')[0] ?? agrup,
        tamanhos: [],
        link: `${config.storeUrl}/${slug}`,
      };
    }
    const tamDeriv = (item.derivacoes ?? []).find((d) => d.derivacao === 2);
    if (tamDeriv) grupos[agrup].tamanhos.push(tamDeriv.valor);
  }

  const produtos = Object.values(grupos).map((g) => ({
    nome: g.nome,
    codigo_pai: g.codigo_pai,
    tamanhos: g.tamanhos.join(', '),
    link: g.link,
  }));

  return { total: produtos.length, produtos };
}
