import { NextResponse } from 'next/server';
import { getPricingSettings, savePricingSettings } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const settings = await getPricingSettings();
    return NextResponse.json({ ok: true, settings });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body) return NextResponse.json({ ok: false, error: 'Empty body' }, { status: 400 });

    await savePricingSettings(body);
    return NextResponse.json({ ok: true, settings: body });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
