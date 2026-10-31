import { NextResponse } from 'next/server';
import { listWithdrawals } from '@/lib/db';
import { verifyAdminRequest } from '@/lib/authGuard';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const auth = await verifyAdminRequest(req);
    if (!auth.ok) {
      return auth.response;
    }

    const withdrawals = await listWithdrawals();
    return NextResponse.json({ ok: true, withdrawals });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
