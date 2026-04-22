-- ─────────────────────────────────────────────────────────────────────
-- 0002_rls.sql — Row-Level Security
--
-- Modelo: agente roda como service_role (bypass RLS). Dashboard é usado
-- por usuários autenticados (admin) que podem ver e editar tudo.
-- Não existe ACL fina — quem tem login no Supabase tem acesso total.
-- ─────────────────────────────────────────────────────────────────────

alter table public.customer_profiles enable row level security;
alter table public.conversations     enable row level security;
alter table public.messages          enable row level security;
alter table public.agent_prompts     enable row level security;
alter table public.agent_config      enable row level security;

-- Authenticated users → full access (dashboard).
create policy "authenticated_full_customer_profiles"
  on public.customer_profiles for all
  to authenticated
  using (true) with check (true);

create policy "authenticated_full_conversations"
  on public.conversations for all
  to authenticated
  using (true) with check (true);

create policy "authenticated_full_messages"
  on public.messages for all
  to authenticated
  using (true) with check (true);

create policy "authenticated_full_agent_prompts"
  on public.agent_prompts for all
  to authenticated
  using (true) with check (true);

create policy "authenticated_full_agent_config"
  on public.agent_config for all
  to authenticated
  using (true) with check (true);

-- Service role bypasses RLS automatically (não precisa policy).
