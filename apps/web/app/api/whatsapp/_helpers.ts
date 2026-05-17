import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { EvolutionHttpError } from '@/lib/evolution/client';

export async function requireUser() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export function unauthorized() {
  return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
}

export function evolutionErrorResponse(err: unknown): NextResponse {
  if (err instanceof EvolutionHttpError) {
    return NextResponse.json(
      { error: 'evolution_error', status: err.status, message: err.message },
      { status: err.status >= 500 ? 502 : err.status },
    );
  }
  console.error('[whatsapp api] evolution call failed', err);
  return NextResponse.json(
    {
      error: 'evolution_unreachable',
      message: 'Não foi possível conectar à Evolution API.',
    },
    { status: 503 },
  );
}
