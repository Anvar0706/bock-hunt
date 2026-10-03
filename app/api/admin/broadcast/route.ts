import { NextResponse } from 'next/server';
import { listUsers } from '@/lib/db';
import { sendTelegramMessage } from '@/bot';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    if (!message || !message.trim()) {
      return NextResponse.json({ ok: false, error: 'Message cannot be empty' }, { status: 400 });
    }

    const users = await listUsers();
    let sent = 0;
    let failed = 0;

    for (const u of users) {
      try {
        const res = await sendTelegramMessage(u.tgId, message);
        if (res) sent++;
        else failed++;
        await new Promise((r) => setTimeout(r, 60)); // respect Telegram rate limit
      } catch {
        failed++;
      }
    }

    return NextResponse.json({ ok: true, total: users.length, sent, failed });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
