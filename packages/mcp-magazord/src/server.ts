import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { configFromEnv, type MagazordConfig } from './config.ts';
import { MagazordClient } from './magazord-client.ts';
import { buscarComEstoque, buscarComEstoqueInput } from './tools/buscar-com-estoque.ts';
import { buscarProdutos, buscarProdutosInput } from './tools/buscar-produtos.ts';
import { consultarEstoque, consultarEstoqueInput } from './tools/consultar-estoque.ts';
import { consultarPreco, consultarPrecoInput } from './tools/consultar-preco.ts';
import { detalhesProduto, detalhesProdutoInput } from './tools/detalhes-produto.ts';
import { buscaAvancada, buscaAvancadaInput } from './tools/busca-avancada.ts';

const SERVER_NAME = 'magazord-chinelaria';
const SERVER_VERSION = '0.0.1';

function jsonResult(payload: unknown) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(payload, null, 2),
      },
    ],
  };
}

export interface CreateServerOptions {
  config?: MagazordConfig;
}

export function createMagazordServer(options: CreateServerOptions = {}): McpServer {
  const config = options.config ?? configFromEnv();
  const client = new MagazordClient(config);
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });

  server.registerTool(
    'BuscarComEstoque',
    {
      description:
        'Busca produtos com ESTOQUE REAL em um tamanho especifico. Retorna apenas produtos disponiveis agora na loja fisica. Use SEMPRE que o cliente mencionar tipo + tamanho (ex: "sandalia 37", "chinelo 35/36", "tenis 38", "havaianas 40").',
      inputSchema: buscarComEstoqueInput.shape,
    },
    async (args) => jsonResult(await buscarComEstoque(client, config, args)),
  );

  server.registerTool(
    'BuscarProdutos',
    {
      description:
        'Busca produtos no catalogo da Chinelaria Leilane Neves por nome ou palavra-chave. Use quando o cliente perguntar sobre um produto, marca ou tipo de calcado SEM mencionar tamanho. Retorna nome, codigo, marca e tamanhos. Nao garante estoque.',
      inputSchema: buscarProdutosInput.shape,
    },
    async (args) => jsonResult(await buscarProdutos(client, config, args)),
  );

  server.registerTool(
    'ConsultarEstoque',
    {
      description:
        'Consulta o estoque em tempo real de um produto especifico. Use para verificar quais tamanhos e cores estao disponiveis de um produto ja identificado. O parametro produtoPai e o codigo SKU retornado pela busca.',
      inputSchema: consultarEstoqueInput.shape,
    },
    async (args) => jsonResult(await consultarEstoque(client, config, args)),
  );

  server.registerTool(
    'ConsultarPreco',
    {
      description:
        'Consulta precos de um produto. Use quando o cliente perguntar quanto custa. O parametro produtoPai e o codigo SKU retornado pela busca.',
      inputSchema: consultarPrecoInput.shape,
    },
    async (args) => jsonResult(await consultarPreco(client, args)),
  );

  server.registerTool(
    'DetalhesProduto',
    {
      description:
        'Busca detalhes completos de um produto: descricao, modelo, derivacoes. Use para dar informacoes detalhadas ao cliente. O parametro codigoProduto e o codigo SKU do produto pai.',
      inputSchema: detalhesProdutoInput.shape,
    },
    async (args) => jsonResult(await detalhesProduto(client, args)),
  );

  server.registerTool(
    'BuscaAvancada',
    {
      description:
        'Busca avancada por nome de derivacao (inclui cor e tamanho). Use APENAS para sugerir tamanhos proximos quando BuscarComEstoque retornar zero. Nao garante estoque.',
      inputSchema: buscaAvancadaInput.shape,
    },
    async (args) => jsonResult(await buscaAvancada(client, config, args)),
  );

  return server;
}
