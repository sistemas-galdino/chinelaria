import { NextResponse } from 'next/server';
import { restartInstance } from '@/lib/evolution/client';
import { evolutionErrorResponse, requireUser, unauthorized } from '../_helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(): Promise<NextResponse> {
  const user = await requireUser();
  if (!user) return unauthorized();

  try {
    const r = await restartInstance();
    return NextResponse.json({ ok: true, state: r.instance.state });
  } catch (err) {
    return evolutionErrorResponse(err);
  }
}
