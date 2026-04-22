import { z } from 'zod';
import type { MagazordClient } from '../magazord-client.ts';
import type { MagazordConfig } from '../config.ts';
import { makeSlug } from '../slug.ts';

export const consultarEstoqueInput = z.object({
  produtoPai: z.string().min(1).describe('Código SKU do produto pai retornado pela busca'),
});

export type ConsultarEstoqueInput = z.infer<typeof consultarEstoqueInput>;

export interface ConsultarEstoqueOutput {
  com_estoque: number;
  sem_estoque: number;
  itens: Array<{
    descricao: string;
    quantidade: number;
    sku: string;
    link: string;
  }>;
}

export async function consultarEstoque(
  client: MagazordClient,
  config: MagazordConfig,
  input: ConsultarEstoqueInput,
): Promise<ConsultarEstoqueOutput | { erro: string }> {
  const data = await client.listEstoque(input.produtoPai, 100);
  if (!Array.isArray(data.data)) {
    return { erro: 'Nao foi possivel consultar estoque' };
  }

  const comEstoque = data.data
    .filter((item) => item.quantidadeDisponivelVenda > 0)
    .map((item) => {
      const derivNome = item.descricaoProduto.split(' - ').pop() ?? item.descricaoProduto;
      const slug = makeSlug(derivNome);
      return {
        descricao: item.descricaoProduto,
        quantidade: item.quantidadeDisponivelVenda,
        sku: item.produto,
        link: `${config.storeUrl}/${slug}`,
      };
    });

  const semEstoque = data.data.filter((item) => item.quantidadeDisponivelVenda === 0).length;

  return {
    com_estoque: comEstoque.length,
    sem_estoque: semEstoque,
    itens: comEstoque,
  };
}
