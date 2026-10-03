import { NextResponse } from 'next/server';
import { listExtractions } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const tgId = url.searchParams.get('tgId') || undefined;
    const extractions = await listExtractions(tgId);
    return NextResponse.json({ ok: true, extractions });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
