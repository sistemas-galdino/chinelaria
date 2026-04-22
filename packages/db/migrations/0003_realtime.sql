-- ─────────────────────────────────────────────────────────────────────
-- 0003_realtime.sql — Habilita Supabase Realtime para o dashboard
-- ─────────────────────────────────────────────────────────────────────

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;
alter publication supabase_realtime add table public.customer_profiles;
