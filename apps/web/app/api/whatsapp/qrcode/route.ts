import { NextResponse } from 'next/server';
import { getConnectQR } from '@/lib/evolution/client';
import { evolutionErrorResponse, requireUser, unauthorized } from '../_helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const user = await requireUser();
  if (!user) return unauthorized();

  try {
    const r = await getConnectQR();
    if (r.instance?.state === 'open') {
      return NextResponse.json({ alreadyConnected: true, state: 'open' });
    }
    return NextResponse.json({
      alreadyConnected: false,
      base64: r.base64 ?? null,
      pairingCode: r.pairingCode ?? r.code ?? null,
      count: r.count ?? null,
    });
  } catch (err) {
    return evolutionErrorResponse(err);
  }
}
