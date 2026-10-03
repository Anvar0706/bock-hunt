import { NextResponse } from 'next/server';
import { getReferralStats } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const tgId = url.searchParams.get('tgId');
    if (!tgId) {
      return NextResponse.json({ ok: false, error: 'tgId is required' }, { status: 400 });
    }

    const cleanId = String(tgId).trim();
    
    const { getDbClient } = await import('@/lib/db');
    const db = getDbClient();

    let test1Rows = -1;
    let test1Err = null;
    try {
      const test1 = await db.execute({
        sql: 'SELECT * FROM referrals WHERE referrerTgId = ? ORDER BY createdAt DESC',
        args: [cleanId]
      });
      test1Rows = test1.rows.length;
    } catch (e: any) {
      test1Err = e?.message;
    }

    const test2 = await db.execute({
      sql: 'SELECT * FROM referrals WHERE referrerTgId = ?',
      args: [cleanId]
    });

    const stats = await getReferralStats(cleanId);

    return NextResponse.json({
      ok: true,
      stats,
      debug: {
        queriedId: cleanId,
        test1_with_orderBy_length: test1Rows,
        test1_error: test1Err,
        test2_without_orderBy_length: test2.rows.length,
        test2_rows: test2.rows,
      }
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
