import { NextResponse } from 'next/server';
import { updateWithdrawalStatus, listWithdrawals, getUser, logAudit } from '@/lib/db';
import { sendTelegramMessage } from '@/bot';
import { getBotMsg } from '@/bot/messages';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

const ADMIN_ID = process.env.ADMIN_USER_ID || process.env.ADMIN_TG_ID || '8515329556';

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit(`admin:withdrawals:${ip}`, 30, 60000);
    if (!rate.allowed) {
      return NextResponse.json({ ok: false, error: 'Rate limit exceeded. Please wait.' }, { status: 429 });
    }

    const { id, status, txHash, note, adminTgId } = await req.json();

    const callerId = String(adminTgId || '').trim();
    if (callerId !== ADMIN_ID) {
      return NextResponse.json({ ok: false, error: 'Unauthorized: Admin privileges required' }, { status: 403 });
    }

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

    await logAudit(callerId, 'update_withdrawal', item?.tgId, { withdrawalId: id, status, txHash, note });

    return NextResponse.json({ ok: true, status });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
