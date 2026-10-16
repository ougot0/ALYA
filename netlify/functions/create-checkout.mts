import type { Config } from '@netlify/functions';
import { getStripe, json, loadProducts } from './_lib/shared';

interface Item { slug: string; color: string | null; qty: number }

export default async (req: Request) => {
  if (req.method !== 'POST') return json(405, { error: 'Méthode non autorisée' });
  const stripe = getStripe();
  if (!stripe) return json(503, { error: 'Le paiement n’est pas encore configuré sur cette boutique.' });

  let items: Item[];
  try {
    items = ((await req.json()) as { items: Item[] }).items;
    if (!Array.isArray(items) || !items.length || items.length > 50) throw new Error();
  } catch {
    return json(400, { error: 'Panier invalide.' });
  }

  const products = loadProducts();
  const lineItems = [];
  for (const it of items) {
    const p = products.get(String(it.slug));
    const qty = Math.floor(Number(it.qty));
    if (!p || p.hidden || p.price === null || !Number.isFinite(qty) || qty < 1 || qty > 20)
      return json(400, { error: 'Un article du panier n’est plus disponible.' });
    if (p.availability === 'out_of_stock' || p.availability === 'coming_soon' || (p.stock !== null && p.stock < qty))
      return json(409, { error: `« ${p.name} » n’est pas disponible dans cette quantité.` });
    if (p.colors.length) {
      const c = p.colors.find((c) => c.name === it.color);
      if (!c || !c.available) return json(409, { error: `Couleur indisponible pour « ${p.name} ».` });
    }
    lineItems.push({
      quantity: qty,
      price_data: {
        currency: 'eur',
        unit_amount: p.price,
        product_data: {
          name: it.color ? `${p.name} — ${it.color}` : p.name,
          metadata: { slug: p.slug, color: it.color ?? '' },
        },
      },
    });
  }

  const site = process.env.SITE_URL || process.env.URL || new URL(req.url).origin;
  const countries = (process.env.SHIPPING_COUNTRIES || 'FR').split(',').map((c) => c.trim().toUpperCase());
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      locale: 'fr',
      shipping_address_collection: { allowed_countries: countries as never },
      success_url: `${site}/commande/confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site}/panier`,
    });
    return json(200, { url: session.url });
  } catch (e) {
    console.error('stripe checkout', e);
    return json(502, { error: 'Le paiement est momentanément indisponible.' });
  }
};

export const config: Config = { path: '/api/create-checkout' };
