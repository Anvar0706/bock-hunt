import { NextResponse } from 'next/server';
import { getAddresses, saveAddresses } from '@/lib/db';
import { verifyAdminRequest } from '@/lib/authGuard';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit(`deposit_addrs:get:${ip}`, 60, 60000);
    if (!rate.allowed) {
      return NextResponse.json({ ok: false, error: 'Rate limit reached' }, { status: 429 });
    }

    const addresses = await getAddresses();
    return NextResponse.json({ ok: true, addresses, ...addresses });
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

    // Cryptographic Admin Verification
    const auth = await verifyAdminRequest(req, body);
    if (!auth.ok) {
      return auth.response;
    }

    const payload = body.addresses || body;
    await saveAddresses(payload);
    const updated = await getAddresses();
    return NextResponse.json({ ok: true, addresses: updated, ...updated });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
