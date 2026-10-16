import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import { getProduct, isPurchasable } from '../data/catalog';

export interface CartLine {
  slug: string;
  color: string | null;
  qty: number;
}

type Action =
  | { type: 'add'; slug: string; color: string | null; qty: number }
  | { type: 'set'; slug: string; color: string | null; qty: number }
  | { type: 'remove'; slug: string; color: string | null }
  | { type: 'clear' };

const KEY = 'alya-cart-v1';
const MAX_QTY = 20;
const same = (l: CartLine, slug: string, color: string | null) => l.slug === slug && l.color === color;
const clamp = (n: number) => Math.max(1, Math.min(MAX_QTY, Math.floor(n) || 1));

function reducer(state: CartLine[], a: Action): CartLine[] {
  switch (a.type) {
    case 'add': {
      const found = state.find((l) => same(l, a.slug, a.color));
      if (found) return state.map((l) => (l === found ? { ...l, qty: clamp(l.qty + a.qty) } : l));
      return [...state, { slug: a.slug, color: a.color, qty: clamp(a.qty) }];
    }
    case 'set':
      return state.map((l) => (same(l, a.slug, a.color) ? { ...l, qty: clamp(a.qty) } : l));
    case 'remove':
      return state.filter((l) => !same(l, a.slug, a.color));
    case 'clear':
      return [];
  }
}

function load(): CartLine[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]') as CartLine[];
    // on écarte les produits disparus ou devenus indisponibles
    return raw.filter((l) => {
      const p = getProduct(l.slug);
      return p && isPurchasable(p);
    });
  } catch {
    return [];
  }
}

interface CartCtx {
  lines: CartLine[];
  count: number;
  subtotal: number;
  dispatch: (a: Action) => void;
}

const Ctx = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, dispatch] = useReducer(reducer, undefined, load);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(lines));
    } catch {
      /* stockage indisponible : le panier reste en mémoire */
    }
  }, [lines]);
  const value = useMemo(() => {
    const count = lines.reduce((s, l) => s + l.qty, 0);
    const subtotal = lines.reduce((s, l) => s + (getProduct(l.slug)?.price ?? 0) * l.qty, 0);
    return { lines, count, subtotal, dispatch };
  }, [lines]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useCart hors CartProvider');
  return c;
}
