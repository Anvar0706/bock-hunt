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
    const stats = await getReferralStats(cleanId);
    
    // Diagnostic query to verify direct table access on server
    const { getDbClient } = await import('@/lib/db');
    const db = getDbClient();
    const countRes = await db.execute('SELECT COUNT(*) as count FROM referrals');
    const allRefs = await db.execute({
      sql: 'SELECT referrerTgId, referredTgId, referredName FROM referrals WHERE referrerTgId = ?',
      args: [cleanId]
    });

    return NextResponse.json({
      ok: true,
      stats,
      debug: {
        queriedId: cleanId,
        totalInTable: Number(countRes.rows[0]?.count || 0),
        directMatchCount: allRefs.rows.length,
        directRows: allRefs.rows,
      }
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
