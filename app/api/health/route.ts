import { NextResponse } from 'next/server';
import { checkDbHealth } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const health = await checkDbHealth();
    if (!health.ok) {
      return NextResponse.json({ ok: false, error: health.error, latencyMs: health.latencyMs }, { status: 503 });
    }
    const rawUrl = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || 'FALLBACK';
    return NextResponse.json({
      ok: true,
      status: 'HEALTHY',
      latencyMs: health.latencyMs,
      dbTarget: rawUrl.slice(0, 35) + '...',
      hasTursoUrlEnv: Boolean(process.env.TURSO_DATABASE_URL),
      hasDbUrlEnv: Boolean(process.env.DATABASE_URL),
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'DB probe failed' }, { status: 500 });
  }
}
