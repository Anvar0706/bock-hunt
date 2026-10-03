import { NextResponse } from 'next/server';
import { listUsers } from '@/lib/db';
import { sendTelegramMessage } from '@/bot';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { target, message } = await req.json();
    if (!message || !String(message).trim()) {
      return NextResponse.json({ ok: false, error: 'Message cannot be empty' }, { status: 400 });
    }

    const cleanMsg = String(message).trim();

    // 1. Single user direct message
    if (target && target !== 'all') {
      const cleanTarget = String(target).replace(/^user-/, '').trim();
      const res = await sendTelegramMessage(cleanTarget, cleanMsg);
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
