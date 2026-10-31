import { NextResponse } from 'next/server';
import { sendTelegramMessage } from '@/bot';
import { verifyAdminRequest } from '@/lib/authGuard';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit(`admin:dm:${ip}`, 20, 60000);
    if (!rate.allowed) {
      return NextResponse.json({ ok: false, error: 'Rate limit reached' }, { status: 429 });
    }

    const body = await req.json();
    const auth = await verifyAdminRequest(req, body);
    if (!auth.ok) {
      return auth.response;
    }

    const { tgId, message } = body || {};
    if (!tgId || !message) {
      return NextResponse.json({ ok: false, error: 'tgId and message required' }, { status: 400 });
    }

    const res = await sendTelegramMessage(String(tgId), message);
    return NextResponse.json({ ok: !!res });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
