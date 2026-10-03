import { NextResponse } from 'next/server';
import { listUsers, logAudit } from '@/lib/db';
import { sendTelegramMessage } from '@/bot';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

const ADMIN_ID = process.env.ADMIN_USER_ID || process.env.ADMIN_TG_ID || '8515329556';

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit(`admin:broadcast:${ip}`, 10, 60000);
    if (!rate.allowed) {
      return NextResponse.json({ ok: false, error: 'Broadcast rate limit reached. Please wait.' }, { status: 429 });
    }

    const { target, message, adminTgId } = await req.json();

    const callerId = String(adminTgId || '').trim();
    if (callerId !== ADMIN_ID) {
      return NextResponse.json({ ok: false, error: 'Unauthorized: Admin privileges required' }, { status: 403 });
    }

    if (!message || !String(message).trim()) {
      return NextResponse.json({ ok: false, error: 'Message cannot be empty' }, { status: 400 });
    }

    const cleanMsg = String(message).trim();

    // 1. Single user direct message
    if (target && target !== 'all') {
      const cleanTarget = String(target).replace(/^user-/, '').trim();
      const res = await sendTelegramMessage(cleanTarget, cleanMsg);
      await logAudit(callerId, 'direct_message', cleanTarget, { length: cleanMsg.length, delivered: Boolean(res) });
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
      if (!u.tgId) continue;
      try {
        const res = await sendTelegramMessage(u.tgId, cleanMsg);
        if (res) sent++;
        else failed++;
        await new Promise((r) => setTimeout(r, 40));
      } catch {
        failed++;
      }
    }

    await logAudit(callerId, 'broadcast_all', undefined, { total: users.length, sent, failed });

    return NextResponse.json({
      ok: true,
      total: users.length,
      sent,
      delivered: sent,
      failed,
    });
  } catch (err: any) {
    console.error('Error in /api/admin/broadcast:', err?.message || err);
    return NextResponse.json({ ok: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
