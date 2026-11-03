import { bot } from '@/bot';
import { webhookCallback } from 'grammy';
import { verifyWebhookSecret } from '@/lib/authGuard';

export const dynamic = 'force-dynamic';

const handleWebhook = webhookCallback(bot, 'std/http');

export async function POST(req: Request) {
  try {
    if (!verifyWebhookSecret(req)) {
      return new Response(JSON.stringify({ error: 'Unauthorized webhook invocation' }), { status: 403 });
    }
    return await handleWebhook(req);
  } catch (err: any) {
    console.error('[Bot Webhook] Error:', err?.message || err);
    return new Response(JSON.stringify({ error: err?.message || 'Unknown error' }), { status: 500 });
  }
}

export async function GET() {
  return new Response('Webhook service active', { status: 200 });
}
