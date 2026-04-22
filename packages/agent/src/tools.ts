import { tool } from '@langchain/core/tools';
import {
  buscaAvancada,
  buscaAvancadaInput,
  buscarComEstoque,
  buscarComEstoqueInput,
  buscarProdutos,
  buscarProdutosInput,
  configFromEnv,
  consultarEstoque,
  consultarEstoqueInput,
  consultarPreco,
  consultarPrecoInput,
  detalhesProduto,
  detalhesProdutoInput,
  MagazordClient,
  type MagazordConfig,
} from '@chinelaria/mcp-magazord';

/**
 * Constrói as 6 tools LangChain wrapping as funções Magazord.
 * Em vez de passar pelo MCP HTTP loopback, usa as funções in-process
 * (zero overhead). O MCP server externo continua exposto para clientes
 * externos (Claude Desktop, MCP Inspector).
 */
export function buildMagazordTools(config?: MagazordConfig) {
  const cfg = config ?? configFromEnv();
  const client = new MagazordClient(cfg);

  return [
    tool(async (input) => JSON.stringify(await buscarComEstoque(client, cfg, input)), {
      name: 'BuscarComEstoque',
      description:
        'Busca produtos com ESTOQUE REAL em um tamanho especifico. Retorna apenas produtos disponiveis agora na loja fisica. Use SEMPRE que o cliente mencionar tipo + tamanho (ex: "sandalia 37", "chinelo 35/36", "tenis 38", "havaianas 40").',
      schema: buscarComEstoqueInput,
    }),
    tool(async (input) => JSON.stringify(await buscarProdutos(client, cfg, input)), {
      name: 'BuscarProdutos',
      description:
        'Busca produtos no catalogo da Chinelaria Leilane Neves por nome ou palavra-chave. Use quando o cliente perguntar sobre um produto, marca ou tipo de calcado SEM mencionar tamanho. Retorna nome, codigo, marca e tamanhos. Nao garante estoque.',
      schema: buscarProdutosInput,
    }),
    tool(async (input) => JSON.stringify(await consultarEstoque(client, cfg, input)), {
      name: 'ConsultarEstoque',
      description:
        'Consulta o estoque em tempo real de um produto especifico. Use para verificar quais tamanhos e cores estao disponiveis de um produto ja identificado. O parametro produtoPai e o codigo SKU retornado pela busca.',
      schema: consultarEstoqueInput,
    }),
    tool(async (input) => JSON.stringify(await consultarPreco(client, input)), {
      name: 'ConsultarPreco',
      description:
        'Consulta precos de um produto. Use quando o cliente perguntar quanto custa. O parametro produtoPai e o codigo SKU retornado pela busca.',
      schema: consultarPrecoInput,
    }),
    tool(async (input) => JSON.stringify(await detalhesProduto(client, input)), {
      name: 'DetalhesProduto',
      description:
        'Busca detalhes completos de um produto: descricao, modelo, derivacoes. Use para dar informacoes detalhadas ao cliente. O parametro codigoProduto e o codigo SKU do produto pai.',
      schema: detalhesProdutoInput,
    }),
    tool(async (input) => JSON.stringify(await buscaAvancada(client, cfg, input)), {
      name: 'BuscaAvancada',
      description:
        'Busca avancada por nome de derivacao (inclui cor e tamanho). Use APENAS para sugerir tamanhos proximos quando BuscarComEstoque retornar zero. Nao garante estoque.',
      schema: buscaAvancadaInput,
    }),
  ];
}
