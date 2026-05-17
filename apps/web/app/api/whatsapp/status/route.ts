import { NextResponse } from 'next/server';
import { fetchInstance, getConnectionState } from '@/lib/evolution/client';
import { evolutionErrorResponse, requireUser, unauthorized } from '../_helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const user = await requireUser();
  if (!user) return unauthorized();

  try {
    const state = await getConnectionState();

    let owner: string | null = null;
    let profileName: string | null = null;
    let profilePictureUrl: string | null = null;

    if (state.instance.state === 'open') {
      try {
        const inst = await fetchInstance();
        owner = inst.ownerJid ?? null;
        profileName = inst.profileName ?? null;
        profilePictureUrl = inst.profilePicUrl ?? null;
      } catch (err) {
        console.warn('[whatsapp/status] fetchInstance failed (best-effort)', err);
      }
    }

    return NextResponse.json({
      instanceName: state.instance.instanceName,
      state: state.instance.state,
      owner,
      ownerNumber: owner ? (owner.split('@')[0] ?? null) : null,
      profileName,
      profilePictureUrl,
    });
  } catch (err) {
    return evolutionErrorResponse(err);
  }
}
