import { NextResponse } from 'next/server';
import { resetAllLimits } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    await resetAllLimits();
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
