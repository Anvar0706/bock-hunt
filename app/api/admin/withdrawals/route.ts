import { NextResponse } from 'next/server';
import { listWithdrawals } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const withdrawals = await listWithdrawals();
    return NextResponse.json({ ok: true, withdrawals });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
