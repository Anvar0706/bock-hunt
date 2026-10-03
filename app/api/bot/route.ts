import { bot } from '@/bot';
import { webhookCallback } from 'grammy';

export const dynamic = 'force-dynamic';

const handleWebhook = webhookCallback(bot, 'std/http');

export async function POST(req: Request) {
  try {
    return await handleWebhook(req);
  } catch (err: any) {
    console.error('[Bot Webhook] Error:', err?.message || err);
    return new Response('OK', { status: 200 });
  }
}

export async function GET() {
  return new Response('BlockHunt Telegram Bot Webhook Active', { status: 200 });
}
