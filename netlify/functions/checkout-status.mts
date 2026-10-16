import type { Config } from '@netlify/functions';
import { getStripe, json } from './_lib/shared';

export default async (req: Request) => {
  const id = new URL(req.url).searchParams.get('session_id');
  const stripe = getStripe();
  if (!stripe) return json(503, { error: 'Paiement non configuré' });
  if (!id || !/^cs_[A-Za-z0-9_]+$/.test(id)) return json(400, { error: 'Session invalide' });
  try {
    const s = await stripe.checkout.sessions.retrieve(id);
    return json(200, { paid: s.payment_status === 'paid', email: s.customer_details?.email ?? null });
  } catch {
    return json(404, { error: 'Session introuvable' });
  }
};

export const config: Config = { path: '/api/checkout-status' };
