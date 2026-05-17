import { NextResponse } from 'next/server';
import { EvolutionHttpError, logoutInstance } from '@/lib/evolution/client';
import { evolutionErrorResponse, requireUser, unauthorized } from '../_helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(): Promise<NextResponse> {
  const user = await requireUser();
  if (!user) return unauthorized();

  try {
    await logoutInstance();
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof EvolutionHttpError && err.status >= 400 && err.status < 500) {
      // Logout pode falhar se já desconectado — sucesso "soft"
      return NextResponse.json({ ok: true, note: 'already_logged_out', status: err.status });
    }
    return evolutionErrorResponse(err);
  }
}
