import { NextResponse } from 'next/server';
import { freshRestartNonAdminData, logAudit } from '@/lib/db';
import { verifyAdminRequest } from '@/lib/authGuard';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit(`admin:fresh-restart:${ip}`, 3, 60000);
    if (!rate.allowed) {
      return NextResponse.json({ ok: false, error: 'Rate limit reached' }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const auth = await verifyAdminRequest(req, body);
    if (!auth.ok) {
      return auth.response;
    }

    const result = await freshRestartNonAdminData(auth.adminId);
    await logAudit(auth.adminId, 'fresh_restart', undefined, { wipedAt: new Date().toISOString() });

    return NextResponse.json({ ...result });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Server error during fresh restart' }, { status: 500 });
  }
}
