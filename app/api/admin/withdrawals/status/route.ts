import { NextResponse } from 'next/server';
import { updateWithdrawalStatus, listWithdrawals, getUser, logAudit } from '@/lib/db';
import { sendTelegramMessage } from '@/bot';
import { getBotMsg } from '@/bot/messages';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { verifyAdminRequest } from '@/lib/authGuard';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit(`admin:withdrawals:${ip}`, 30, 60000);
    if (!rate.allowed) {
      return NextResponse.json({ ok: false, error: 'Rate limit exceeded. Please wait.' }, { status: 429 });
    }

    const body = await req.json();
    const auth = await verifyAdminRequest(req, body);
    if (!auth.ok) {
      return auth.response;
    }

    const { id, status, txHash, note } = body || {};

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
          network: item.network,
          reason: note || (userLang === 'ru' ? 'Неверный адрес или подозрение на мультиаккаунт' : 'Invalid address or security hold'),
        });
        sendTelegramMessage(item.tgId, msg).catch(() => {});
      }

      await logAudit(auth.adminId, `withdrawal_${status.toLowerCase()}`, String(item.tgId), {
        withdrawalId: id,
        amount: item.amountUsd,
        txHash,
        note,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
