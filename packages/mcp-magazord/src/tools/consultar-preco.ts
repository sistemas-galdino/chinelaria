import { z } from 'zod';
import type { MagazordClient } from '../magazord-client.ts';

export const consultarPrecoInput = z.object({
  produtoPai: z.string().min(1).describe('Código SKU do produto pai para consultar preço'),
});

export type ConsultarPrecoInput = z.infer<typeof consultarPrecoInput>;

export interface ConsultarPrecoOutput {
  total: number;
  precos: Array<{
    produto: string;
    sku: string;
    preco_venda: number;
    preco_antigo?: number;
    desconto?: number;
  }>;
}

export async function consultarPreco(
  client: MagazordClient,
  input: ConsultarPrecoInput,
): Promise<ConsultarPrecoOutput | { erro: string }> {
  const data = await client.listPreco(input.produtoPai, 100);
  if (!Array.isArray(data.data)) {
    return { erro: 'Nao foi possivel consultar precos' };
  }

  const precos = data.data.map((item) => ({
    produto: item.produtoNome,
    sku: item.produto,
    preco_venda: item.precoVenda,
    preco_antigo: item.precoAntigo,
    desconto: item.percentualDesconto,
  }));

  return { total: precos.length, precos };
}
