import { NextResponse } from 'next/server';
import {
  listUsers,
  updateUser,
  deleteUser,
  resetUserLimit,
  resetAllLimits,
  logAudit,
} from '@/lib/db';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

const ADMIN_ID = process.env.ADMIN_USER_ID || process.env.ADMIN_TG_ID || '8515329556';

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit(`admin:user_update:${ip}`, 45, 60000);
    if (!rate.allowed) {
      return NextResponse.json({ ok: false, error: 'Rate limit exceeded. Please wait.' }, { status: 429 });
    }

    const body = await req.json();
    const { action, userId, plan, status, adminTgId } = body || {};

    // Server-side admin authorization verification
    const callerId = String(adminTgId || '').trim();
    if (callerId !== ADMIN_ID) {
      return NextResponse.json({ ok: false, error: 'Unauthorized: Admin privileges required' }, { status: 403 });
    }

    const tgId = String(userId || '').replace(/^user-/, '').trim();

    if (action === 'update_plan' && tgId && plan) {
      await updateUser(tgId, { plan: String(plan) });
      await logAudit(callerId, 'update_plan', tgId, { plan });
    } else if (action === 'reset_limit') {
      if (tgId === 'all' || userId === 'all') {
        await resetAllLimits();
        await logAudit(callerId, 'reset_limit_all');
      } else if (tgId) {
        await resetUserLimit(tgId);
        await logAudit(callerId, 'reset_limit', tgId);
      }
    } else if (action === 'reset_stats' && tgId) {
      await updateUser(tgId, { extractsCount: 0, totalExtractedUsd: 0 });
      await logAudit(callerId, 'reset_stats', tgId);
    } else if (action === 'toggle_status' && tgId && status) {
      await updateUser(tgId, { status: String(status) });
      await logAudit(callerId, 'toggle_status', tgId, { status });
    } else if (action === 'delete' && tgId) {
      await deleteUser(tgId);
      await logAudit(callerId, 'delete_user', tgId);
    }

    const updatedUsers = await listUsers();
    return NextResponse.json({ ok: true, users: updatedUsers });
  } catch (err: any) {
    console.error('Error in /api/users/update:', err?.message || err);
    return NextResponse.json({ ok: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}