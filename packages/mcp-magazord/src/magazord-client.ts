import type { MagazordConfig } from './config.ts';

export class MagazordClient {
  constructor(private readonly config: MagazordConfig) {}

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const url = `${this.config.baseUrl}${path}`;
    const res = await fetch(url, {
      ...init,
      headers: {
        Authorization: this.config.authBasic,
        Accept: 'application/json',
        ...(init?.headers ?? {}),
      },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Magazord ${res.status} ${res.statusText} on ${path}: ${body.slice(0, 300)}`);
    }
    return (await res.json()) as T;
  }

  /** GET `/api/v2/site/produtoDerivacoes?nome=&ativo=1&limit=20` */
  produtoDerivacoes(nome: string, limit = 20): Promise<MagazordDerivacoesResponse> {
    const params = new URLSearchParams({ nome, ativo: '1', limit: String(limit) });
    return this.request(`/api/v2/site/produtoDerivacoes?${params.toString()}`);
  }

  /** GET `/api/v1/listEstoque?produtoPai=&ativo=true&limit=100` */
  listEstoque(produtoPai: string, limit = 100): Promise<MagazordEstoqueResponse> {
    const params = new URLSearchParams({
      produtoPai,
      ativo: 'true',
      limit: String(limit),
    });
    return this.request(`/api/v1/listEstoque?${params.toString()}`);
  }

  /** GET `/api/v1/listPreco?tabelaPreco=1&produtoPai=&ativo=1&limit=100` */
  listPreco(produtoPai: string, limit = 100): Promise<MagazordPrecoResponse> {
    const params = new URLSearchParams({
      tabelaPreco: '1',
      produtoPai,
      ativo: '1',
      limit: String(limit),
    });
    return this.request(`/api/v1/listPreco?${params.toString()}`);
  }

  /** GET `/api/v2/site/produto/{codigoProduto}` */
  produtoDetalhes(codigoProduto: string): Promise<MagazordProdutoDetalhesResponse> {
    return this.request(`/api/v2/site/produto/${encodeURIComponent(codigoProduto)}`);
  }

  /**
   * POST `/api/v3/produtos/query?limit={limit}`
   * body: `{ filters: [{ field, operator, value }] }`
   */
  produtosQuery(
    filters: Array<{ field: string; operator: string; value: string }>,
    limit = 50,
  ): Promise<MagazordProdutosQueryResponse> {
    return this.request(`/api/v3/produtos/query?limit=${limit}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filters }),
    });
  }
}

// ─── Response shapes (parciais — só o que usamos) ─────────────────

export interface MagazordDerivacoesResponse {
  status?: string;
  data?: {
    items?: Array<{
      codigo: string;
      agrupador?: string;
      nome: string;
      nomeCompleto?: string;
      derivacoes?: Array<{ derivacao: number; valor: string }>;
    }>;
  };
}

export interface MagazordEstoqueItem {
  produto: string;
  descricaoProduto: string;
  quantidadeDisponivelVenda: number;
}

export interface MagazordEstoqueResponse {
  data?: MagazordEstoqueItem[];
}

export interface MagazordPrecoItem {
  produto: string;
  produtoNome: string;
  precoVenda: number;
  precoAntigo?: number;
  percentualDesconto?: number;
}

export interface MagazordPrecoResponse {
  data?: MagazordPrecoItem[];
}

export interface MagazordProdutoDetalhesResponse {
  status?: string;
  data?: {
    nome: string;
    modelo?: string;
    codigo: string;
    marca?: number | string;
    acompanha?: string;
    ativo?: boolean;
    palavraChave?: string;
    produtoLoja?: Array<{
      titulo?: string;
      tituloComplemento?: string;
      descricao?: string;
    }>;
  };
}

export interface MagazordProdutosQueryItem {
  codigoProduto: string;
  derivacaoCodigo?: string;
  nomeProduto: string;
  nomeDerivacao?: string;
  nomeMarca?: string;
  ativo?: boolean;
}

export interface MagazordProdutosQueryResponse {
  total?: number;
  items?: MagazordProdutosQueryItem[];
}
