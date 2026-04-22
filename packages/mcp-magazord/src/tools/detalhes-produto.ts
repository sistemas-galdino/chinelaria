import { z } from 'zod';
import type { MagazordClient } from '../magazord-client.ts';

export const detalhesProdutoInput = z.object({
  codigoProduto: z.string().min(1).describe('Código SKU do produto pai para buscar detalhes'),
});

export type DetalhesProdutoInput = z.infer<typeof detalhesProdutoInput>;

export interface DetalhesProdutoOutput {
  nome: string;
  modelo?: string;
  codigo: string;
  marca_id: number | string | null;
  titulo?: string;
  complemento?: string;
  descricao: string;
  acompanha?: string;
  ativo?: boolean;
  palavras_chave: string;
}

export async function detalhesProduto(
  client: MagazordClient,
  input: DetalhesProdutoInput,
): Promise<DetalhesProdutoOutput | { erro: string }> {
  const data = await client.produtoDetalhes(input.codigoProduto);
  if (data.status !== 'success' || !data.data) {
    return { erro: 'Produto nao encontrado' };
  }

  const p = data.data;
  const info = p.produtoLoja?.[0] ?? {};
  const descClean = (info.descricao ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 500);

  return {
    nome: p.nome,
    modelo: p.modelo,
    codigo: p.codigo,
    marca_id: p.marca ?? null,
    titulo: info.titulo,
    complemento: info.tituloComplemento,
    descricao: descClean,
    acompanha: p.acompanha,
    ativo: p.ativo,
    palavras_chave: (p.palavraChave ?? '').substring(0, 200),
  };
}
