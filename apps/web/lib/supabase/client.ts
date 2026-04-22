'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@chinelaria/db';

/** Cliente Supabase para Client Components — usa cookies via SSR helper. */
export function getSupabaseBrowserClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
