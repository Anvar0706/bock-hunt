import { NextResponse } from 'next/server';
import { listUsers } from '@/lib/db';
import { verifyAdminRequest } from '@/lib/authGuard';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const auth = await verifyAdminRequest(req);
    if (!auth.ok) {
      return auth.response;
    }

    const users = await listUsers();
    return NextResponse.json({ ok: true, users });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
