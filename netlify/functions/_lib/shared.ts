import Stripe from 'stripe';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { Product } from '../../../src/data/types';

export const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

let stripe: Stripe | null = null;
export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  stripe ??= new Stripe(key);
  return stripe;
}

/** Les prix font foi côté serveur : jamais ceux envoyés par le navigateur. */
export function loadProducts(): Map<string, Product> {
  const dir = resolve(process.cwd(), 'content/products');
  const map = new Map<string, Product>();
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    const p = JSON.parse(readFileSync(join(dir, f), 'utf8')) as Product;
    map.set(p.slug, p);
  }
  return map;
}
