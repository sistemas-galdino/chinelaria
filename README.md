# Chinelaria — Atendimento WhatsApp com IA

Agente conversacional para a Chinelaria Leilane Neves (Votuporanga-SP). Substitui o setup n8n + GoHighLevel anterior por um stack TypeScript próprio com dashboard de gerenciamento, transferência para humano, memória estruturada e suporte a mídia.

## Arquitetura

```
WhatsApp ─▶ Evolution API ─▶ Next.js (apps/web)
                                ├─ /api/webhook/evolution  (entrada)
                                ├─ /api/mcp/sse            (MCP server)
                                ├─ /api/agent/run          (LangGraph)
                                └─ /conversations          (dashboard)
                                       │
                                       ▼
                               Supabase Postgres
                                       │
                                       ▼
                               Magazord API (catálogo)
```

## Stack

- Next.js 15 (App Router) — dashboard + webhooks + MCP server SSE
- LangGraph.js — orquestração do agente com Postgres checkpointer
- @modelcontextprotocol/sdk — MCP server e client
- Supabase — Postgres + Auth + Realtime
- OpenAI GPT-5 — texto e visão; Whisper — STT
- Evolution API — gateway WhatsApp
- Deploy: EasyPanel (Dockerfile multi-stage)

## Workspaces

```
apps/web                  Next.js dashboard + API
packages/agent            LangGraph graph + nodes
packages/mcp-magazord     MCP server (6 tools Magazord)
packages/db               Migrations Supabase + types gerados
packages/shared           Tipos compartilhados
legacy/                   n8n workflows, prompts, scripts Python (referência)
```

## Setup local

```bash
pnpm install
cp .env.example .env       # preencher com chaves reais
pnpm dev                   # sobe Next.js em http://localhost:3000
```

Para inspecionar o MCP server isoladamente:

```bash
npx @modelcontextprotocol/inspector http://localhost:3000/api/mcp/sse
```

## Deploy

Push na `main` → EasyPanel rebuilda automaticamente via Dockerfile.

## Roadmap

Ver `/Users/davidabn/.claude/plans/` para o plano completo de implementação por fases.
