# Setup — Pendências para terminar a infra

## Provisionado automaticamente

- **Supabase project:** `chinelaria-agent` em `sa-east-1` (ID: `tgxcybavjxmjprcetesz`)
- **GitHub repo:** https://github.com/sistemas-galdino/chinelaria (privado)
- **Anon key Supabase:** já em `.env`

## Você precisa colocar no `.env` (manualmente)

### 1. OpenAI

`OPENAI_API_KEY` — pegue em https://platform.openai.com/api-keys

### 2. Supabase service-role e DB URL

Acesse:
- Service role: https://supabase.com/dashboard/project/tgxcybavjxmjprcetesz/settings/api → "service_role" (secret)
- DB password: https://supabase.com/dashboard/project/tgxcybavjxmjprcetesz/settings/database → "Database password" (clique em "Reset" se não souber)

Substitua `PASSWORD` no `SUPABASE_DB_URL`.

### 3. Evolution API

- `EVOLUTION_BASE_URL` — URL do seu servidor Evolution (ex: `https://evo.seudominio.com`)
- `EVOLUTION_API_KEY` — global API key do Evolution (do `.env` do servidor Evolution)
- `EVOLUTION_INSTANCE` — nome da instância (default: `chinelaria`)
- `EVOLUTION_WEBHOOK_SECRET` — gera com `openssl rand -hex 32`

### 4. MCP auth token

Gera com `openssl rand -hex 32` e cole em `MCP_AUTH_TOKEN`. É o token que o agente vai usar para falar com o próprio MCP server (loopback).

## EasyPanel (depois)

Quando for fazer o deploy:
1. Criar app a partir do GitHub repo `sistemas-galdino/chinelaria`
2. Build via Dockerfile (`docker/Dockerfile`)
3. Copiar todas as vars do `.env` no EasyPanel (mas com URLs/secrets de produção)
4. Ajustar `NEXT_PUBLIC_APP_URL` e `MCP_INTERNAL_URL` para a URL pública
