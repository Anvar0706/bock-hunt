import { NextResponse } from 'next/server';
import { sendTelegramMessage } from '@/bot';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { tgId, message } = await req.json();
    if (!tgId || !message) {
      return NextResponse.json({ ok: false, error: 'tgId and message required' }, { status: 400 });
    }

    const res = await sendTelegramMessage(String(tgId), message);
    return NextResponse.json({ ok: !!res });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
