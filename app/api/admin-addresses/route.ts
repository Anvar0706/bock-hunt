import { NextResponse } from 'next/server';
import { getAddresses, saveAddresses } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const addresses = await getAddresses();
    return NextResponse.json({ ok: true, addresses });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ ok: false, error: 'Invalid addresses payload' }, { status: 400 });
    }

    await saveAddresses(body);
    const updated = await getAddresses();
    return NextResponse.json({ ok: true, addresses: updated });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
