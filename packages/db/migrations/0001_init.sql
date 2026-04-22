-- ─────────────────────────────────────────────────────────────────────
-- 0001_init.sql — Tabelas core do agente WhatsApp da Chinelaria
-- ─────────────────────────────────────────────────────────────────────

create extension if not exists pgcrypto;

-- ─── Perfil do cliente (memória de longo prazo) ─────────────────────
create table public.customer_profiles (
  phone_number   text primary key,
  display_name   text,
  size_pref      text,
  brand_prefs    text[] default '{}',
  notes          text,
  last_seen_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index customer_profiles_last_seen_idx on public.customer_profiles (last_seen_at desc nulls last);

-- ─── Conversas (uma por phone_number, longa duração) ────────────────
create table public.conversations (
  id                 uuid primary key default gen_random_uuid(),
  phone_number       text not null references public.customer_profiles(phone_number) on delete cascade,
  thread_id          text not null,
  agent_paused       boolean not null default false,
  paused_reason      text,
  paused_at          timestamptz,
  last_message_at    timestamptz,
  last_message_role  text check (last_message_role in ('customer','agent','human','system')),
  unread_count       int not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (phone_number)
);

create index conversations_last_message_idx on public.conversations (last_message_at desc nulls last);
create index conversations_paused_idx on public.conversations (agent_paused) where agent_paused = true;

-- ─── Mensagens (histórico bruto) ────────────────────────────────────
create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role            text not null check (role in ('customer','agent','human','system')),
  content         text,
  media_url       text,
  media_type      text check (media_type in ('image','audio','video')),
  media_mimetype  text,
  metadata        jsonb default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

create index messages_conv_created_idx on public.messages (conversation_id, created_at);

-- ─── Versionamento do system prompt ─────────────────────────────────
create table public.agent_prompts (
  id          serial primary key,
  content     text not null,
  label       text,
  is_active   boolean not null default false,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- só pode existir um prompt ativo
create unique index agent_prompts_unique_active_idx on public.agent_prompts (is_active) where is_active = true;

-- ─── Config livre do agente (modelo, temperature, on/off global) ────
create table public.agent_config (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users(id) on delete set null
);

-- ─── Trigger para manter updated_at atualizado ──────────────────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger customer_profiles_touch before update on public.customer_profiles
  for each row execute function public.touch_updated_at();

create trigger conversations_touch before update on public.conversations
  for each row execute function public.touch_updated_at();
