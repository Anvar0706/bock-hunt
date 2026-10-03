import { NextResponse } from 'next/server';
import {
  listUsers,
  updateUser,
  deleteUser,
  resetUserLimit,
  resetAllLimits,
} from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, userId, plan, status } = body || {};
    const tgId = String(userId || '').replace(/^user-/, '').trim();

    if (action === 'update_plan' && tgId && plan) {
      await updateUser(tgId, { plan: String(plan) });
    } else if (action === 'reset_limit') {
      if (tgId === 'all' || userId === 'all') {
        await resetAllLimits();
      } else if (tgId) {
        await resetUserLimit(tgId);
      }
    } else if (action === 'reset_stats' && tgId) {
      await updateUser(tgId, { extractsCount: 0, totalExtractedUsd: 0 });
    } else if (action === 'toggle_status' && tgId && status) {
      await updateUser(tgId, { status: String(status) });
    } else if (action === 'delete' && tgId) {
      await deleteUser(tgId);
    }

    const updatedUsers = await listUsers();
    return NextResponse.json({ ok: true, users: updatedUsers });
  } catch (err: any) {
    console.error('Error in /api/users/update:', err?.message || err);
    return NextResponse.json({ ok: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}