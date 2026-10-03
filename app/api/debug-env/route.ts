import { NextResponse } from 'next/server';
import { createClient } from '@libsql/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  const envKeys = Object.keys(process.env).filter((k) =>
    k.includes('TURSO') ||
    k.includes('DATA') ||
    k.includes('BOT') ||
    k.includes('ADMIN') ||
    k.includes('VERCEL')
  );

  const tursoUrl = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || '';
  const tursoToken = process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN || '';

  let tursoTest = 'not attempted';
  let tursoError = null;

  if (tursoUrl) {
    try {
      const client = createClient({
        url: tursoUrl.trim(),
        authToken: tursoToken.trim() || undefined,
      });
      const res = await client.execute('SELECT 1 as test');
      tursoTest = SUCCESS: ;
    } catch (err: any) {
      tursoTest = 'FAILED';
      tursoError = err?.message || String(err);
    }
  }

  return NextResponse.json({
    commit: 'debug-v1',
    envKeys,
    hasTursoUrl: Boolean(process.env.TURSO_DATABASE_URL),
    tursoUrlValue: process.env.TURSO_DATABASE_URL ? ${process.env.TURSO_DATABASE_URL.slice(0, 15)}... : null,
    hasDbUrl: Boolean(process.env.DATABASE_URL),
    dbUrlValue: process.env.DATABASE_URL ? ${process.env.DATABASE_URL.slice(0, 15)}... : null,
    hasTursoToken: Boolean(process.env.TURSO_AUTH_TOKEN),
    hasDbToken: Boolean(process.env.DATABASE_AUTH_TOKEN),
    hasBotToken: Boolean(process.env.BOT_TOKEN),
    tursoTest,
    tursoError,
  });
}