# Setup — Pendências e deploy

## Provisionado automaticamente

- **Supabase project:** `chinelaria-agent` em `sa-east-1` (ID: `tgxcybavjxmjprcetesz`)
  - Schema, RLS, Realtime e seed do prompt v1 já aplicados.
- **GitHub repo:** https://github.com/sistemas-galdino/chinelaria (privado)
- **Anon key Supabase:** já em `.env`

## Antes de rodar localmente — preencher `.env`

### 1. OpenAI

`OPENAI_API_KEY` — pegue em https://platform.openai.com/api-keys

### 2. Supabase service-role e DB URL

- Service role: https://supabase.com/dashboard/project/tgxcybavjxmjprcetesz/settings/api → "service_role" (secret)
- DB password: https://supabase.com/dashboard/project/tgxcybavjxmjprcetesz/settings/database → "Database password" (clique em "Reset" se não souber)

Substitua `PASSWORD` no `SUPABASE_DB_URL`.

> O LangGraph PostgresSaver criará as tabelas `checkpoints` e `checkpoint_writes` automaticamente na primeira chamada do agente.

### 3. Evolution API

- `EVOLUTION_BASE_URL` — URL do seu servidor Evolution (ex: `https://evo.seudominio.com`)
- `EVOLUTION_API_KEY` — global API key do Evolution (do `.env` do servidor Evolution)
- `EVOLUTION_INSTANCE` — nome da instância (default: `chinelaria`)
- `EVOLUTION_WEBHOOK_SECRET` — gera com `openssl rand -hex 32`

### 4. Criar usuário admin no Supabase Auth

Acesse https://supabase.com/dashboard/project/tgxcybavjxmjprcetesz/auth/users → "Add user" → email/senha. Esse é o login do dashboard.

## Rodar local

```bash
pnpm install
pnpm dev          # Next.js em http://localhost:3000
```

Acesse http://localhost:3000/login com o usuário criado acima.

## Configurar webhook Evolution → app local (dev)

Use ngrok ou similar para expor `localhost:3000`. No painel Evolution:

```
POST {EVOLUTION_BASE_URL}/webhook/set/{EVOLUTION_INSTANCE}
{
  "url": "https://seu-tunel.ngrok.app/api/webhook/evolution",
  "events": ["MESSAGES_UPSERT"],
  "headers": { "Authorization": "Bearer SEU_EVOLUTION_WEBHOOK_SECRET" }
}
```

Manda uma mensagem para o WhatsApp da instância → vê aparecer no dashboard.

## Deploy no EasyPanel

1. **Criar app no EasyPanel:**
   - Type: App
   - Source: GitHub → `sistemas-galdino/chinelaria` → branch `main`
   - Build: Dockerfile → path `docker/Dockerfile`
   - Port: `3000`

2. **Copiar variáveis de ambiente** do `.env` para o EasyPanel, ajustando para produção:
   - `NEXT_PUBLIC_APP_URL` → URL pública (ex: `https://chinelaria.seudominio.com`)
   - `MCP_INTERNAL_URL` → mesma URL pública + `/api/mcp/sse` (não usado em V1, mas reservado)
   - `EVOLUTION_BASE_URL` → URL do Evolution prod (provavelmente `https://black-eagle-n8n-evolution.yuphse.easypanel.host` ou similar)

3. **Domínio:** apontar um subdomínio (ex: `chinelaria.seudominio.com`) para o app.

4. **Atualizar webhook do Evolution** apontando para a URL prod:
   ```
   POST {EVOLUTION_BASE_URL}/webhook/set/{EVOLUTION_INSTANCE}
   {
     "url": "https://chinelaria.seudominio.com/api/webhook/evolution",
     "events": ["MESSAGES_UPSERT"],
     "headers": { "Authorization": "Bearer SEU_EVOLUTION_WEBHOOK_SECRET" }
   }
   ```

5. **Smoke test (7 cenários):**
   1. Mandar "oi" do WhatsApp → ver mensagem no dashboard em até 2s
   2. Mandar "sandália 37" → agente responde com produtos reais do estoque
   3. Mandar "quanto custa?" → agente responde com preço da seleção atual
   4. (Fase 6) Mandar foto → agente vê e responde
   5. Mandar "vou comprar" / "quero a azul" → agente pausa + dashboard mostra badge
   6. Responder pelo dashboard → cliente recebe no WhatsApp
   7. Clicar "Reativar agente" → próxima msg do cliente vai pro bot

## O que ainda não foi entregue

- **Fase 6 — multimodal:** processamento de imagens (GPT-5 vision) e áudio (Whisper). Hoje vídeo aciona handoff automático; imagens e áudio são salvos mas não processados pelo agente.
- **MCP server HTTP endpoint:** o servidor MCP existe como package, mas ainda não é exposto via HTTP. O agente usa as tools direto in-process. Para expor para Claude Desktop ou MCP Inspector, criar `apps/web/app/api/mcp/[transport]/route.ts`.
- **Notificação push para Leilane** quando handoff acontece (dashboard só).
- **Analytics, A/B test de prompts, eval framework** — V2.
