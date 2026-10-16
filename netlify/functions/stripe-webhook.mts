import type { Config } from '@netlify/functions';
import { getStripe, json } from './_lib/shared';

/**
 * Point d'entrée des événements Stripe (signature vérifiée).
 * Les commandes payées sont consultables dans le Dashboard Stripe (Paiements).
 * Brancher ici l'envoi d'un e-mail ou l'écriture dans une base si besoin.
 */
export default async (req: Request) => {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) return json(503, { error: 'Webhook non configuré' });
  const sig = req.headers.get('stripe-signature');
  if (!sig) return json(400, { error: 'Signature manquante' });
  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(await req.text(), sig, secret);
  } catch {
    return json(400, { error: 'Signature invalide' });
  }
  if (event.type === 'checkout.session.completed' && event.data.object.payment_status === 'paid') {
    const s = event.data.object;
    console.log(`Commande payée ${s.id} — ${(s.amount_total ?? 0) / 100} ${s.currency} — ${s.customer_details?.email ?? ''}`);
  }
  return json(200, { received: true });
};

export const config: Config = { path: '/api/stripe-webhook' };
