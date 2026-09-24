import Stripe from 'stripe';
import { NextRequest } from 'next/server';

export interface WebhookVerificationResult {
  valid: boolean;
  event?: any;
  error?: string;
}

export async function verifyStripeSignature(
  req: NextRequest,
  secret: string
): Promise<WebhookVerificationResult> {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return { valid: false, error: 'Falta stripe-signature header' };
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2024-06-20' as any
    });

    const event = stripe.webhooks.constructEvent(rawBody, signature, secret);
    return { valid: true, event };
  } catch (err: any) {
    return { valid: false, error: err.message };
  }
}

export async function verifyGetnetSignature(
  req: NextRequest,
  secret: string
): Promise<WebhookVerificationResult> {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-getnet-signature') || req.headers.get('getnet-signature');

    if (!signature) {
      return { valid: false, error: 'Falta firma Getnet' };
    }

    const crypto = await import('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    if (signature !== expectedSignature) {
      return { valid: false, error: 'Firma Getnet inválida' };
    }

    const event = JSON.parse(rawBody);
    return { valid: true, event };
  } catch (err: any) {
    return { valid: false, error: err.message };
  }
}

export function getWebhookSecret(gateway: 'stripe' | 'getnet'): string {
  const secret = gateway === 'stripe'
    ? process.env.STRIPE_WEBHOOK_SECRET
    : process.env.GETNET_WEBHOOK_SECRET;

  if (!secret) {
    throw new Error(`${gateway.toUpperCase()}_WEBHOOK_SECRET no configurado`);
  }
  return secret;
}