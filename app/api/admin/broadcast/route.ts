import { NextResponse } from 'next/server';
import { listUsers, logAudit } from '@/lib/db';
import { sendTelegramMessage } from '@/bot';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { verifyAdminRequest } from '@/lib/authGuard';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit(`admin:broadcast:${ip}`, 10, 60000);
    if (!rate.allowed) {
      return NextResponse.json({ ok: false, error: 'Broadcast rate limit reached. Please wait.' }, { status: 429 });
    }

    const body = await req.json();
    const auth = await verifyAdminRequest(req, body);
    if (!auth.ok) {
      return auth.response;
    }

    const { target, message } = body || {};

    if (!message || !String(message).trim()) {
      return NextResponse.json({ ok: false, error: 'Message cannot be empty' }, { status: 400 });
    }

    const cleanMsg = String(message).trim();

    // 1. Single user direct message
    if (target && target !== 'all') {
      const cleanTarget = String(target).replace(/^user-/, '').trim();
      const res = await sendTelegramMessage(cleanTarget, cleanMsg);
      await logAudit(auth.adminId, 'direct_message', cleanTarget, { length: cleanMsg.length, delivered: Boolean(res) });
      if (res) {
        return NextResponse.json({ ok: true, delivered: 1, failed: 0, sent: 1 });
      } else {
        return NextResponse.json({
          ok: false,
          error: 'Failed to deliver message. User might have blocked the bot or chat ID is invalid.',
          delivered: 0,
          failed: 1,
        });
      }
    }

    // 2. Broadcast to all users
    const users = await listUsers();
    let sent = 0;
    let failed = 0;

    for (const u of users) {
      try {
        const res = await sendTelegramMessage(u.tgId, cleanMsg);
        if (res) sent++;
        else failed++;
        // Throttle to respect Telegram rate limits
        await new Promise((r) => setTimeout(r, 65));
      } catch {
        failed++;
      }
    }

    await logAudit(auth.adminId, 'broadcast', 'all', { sent, failed, total: users.length });

    return NextResponse.json({ ok: true, sent, failed, total: users.length });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
