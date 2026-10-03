import { NextResponse } from 'next/server';
import { updateWithdrawalStatus, listWithdrawals, getUser } from '@/lib/db';
import { sendTelegramMessage } from '@/bot';
import { getBotMsg } from '@/bot/messages';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { id, status, txHash, note } = await req.json();

    if (!id || (status !== 'PAID' && status !== 'REJECTED')) {
      return NextResponse.json({ ok: false, error: 'Invalid payload' }, { status: 400 });
    }

    await updateWithdrawalStatus(String(id), status, txHash, note);

    // Find the withdrawal record to notify user
    const all = await listWithdrawals();
    const item = all.find((w) => w.id === id);

    if (item) {
      const user = await getUser(item.tgId);
      const userLang = user?.lang || 'en';

      if (status === 'PAID') {
        const msg = getBotMsg(userLang, 'withdrawalApproved', {
          amountUsd: item.amountUsd,
          network: item.network,
          address: item.walletAddress,
          txHash,
        });
        sendTelegramMessage(item.tgId, msg).catch(() => {});
      } else if (status === 'REJECTED') {
        const msg = getBotMsg(userLang, 'withdrawalRejected', {
          amountUsd: item.amountUsd,
          reason: note,
        });
        sendTelegramMessage(item.tgId, msg).catch(() => {});
      }
    }

    return NextResponse.json({ ok: true, status });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
