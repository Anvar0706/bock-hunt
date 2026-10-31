import { NextResponse } from 'next/server';
import { getPricingSettings, savePricingSettings } from '@/lib/db';
import { verifyAdminRequest } from '@/lib/authGuard';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit(`pricing:get:${ip}`, 60, 60000);
    if (!rate.allowed) {
      return NextResponse.json({ ok: false, error: 'Rate limit reached' }, { status: 429 });
    }

    const settings = await getPricingSettings();
    return NextResponse.json({ ok: true, settings });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ ok: false, error: 'Empty or invalid body' }, { status: 400 });
    }

    // Cryptographic Admin Verification
    const auth = await verifyAdminRequest(req, body);
    if (!auth.ok) {
      return auth.response;
    }

    await savePricingSettings(body);
    return NextResponse.json({ ok: true, settings: body });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
