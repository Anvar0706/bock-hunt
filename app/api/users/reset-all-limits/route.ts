import { NextResponse } from 'next/server';
import { resetAllLimits } from '@/lib/db';
import { verifyAdminRequest } from '@/lib/authGuard';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const auth = await verifyAdminRequest(req);
    if (!auth.ok) {
      return auth.response;
    }

    await resetAllLimits();
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
