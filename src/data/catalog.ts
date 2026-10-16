import type { Availability, Product, Settings } from './types';
import settingsJson from '../../content/settings.json';

/** Source unique : les fichiers JSON de /content, éditables à la main ou via /admin (Decap CMS). */
const modules = import.meta.glob<Product>('../../content/products/*.json', { eager: true, import: 'default' });

export const settings = settingsJson as Settings;

/** Mode aperçu (npm run build:preview) : chemins relatifs et prix de démonstration signalés à l'écran. */
export const DEMO = import.meta.env.VITE_DEMO === '1';
const DEMO_PRICES: Record<string, number> = { 'lampe-onde': 8900, 'support-trame': 3400 };
const rel = (u?: string) => (u && import.meta.env.BASE_URL !== '/' ? import.meta.env.BASE_URL + u.replace(/^\//, '') : u);
const prepare = (p: Product): Product => {
  const images = p.images.map((i) => ({ ...i, src: rel(i.src)!, depth: rel(i.depth), mask: rel(i.mask) }));
  if (!DEMO || p.price !== null) return { ...p, images };
  return { ...p, images, price: DEMO_PRICES[p.slug] ?? 4500, availability: 'made_to_order' };
};

export const allProducts: Product[] = Object.values(modules)
  .filter((p) => !p.hidden)
  .map(prepare)
  .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

export const getProduct = (slug: string) => allProducts.find((p) => p.slug === slug);
export const getCategory = (slug: string) => settings.categories.find((c) => c.slug === slug);
export const productsIn = (cat: string) => allProducts.filter((p) => p.category === cat);

export const isPurchasable = (p: Product) =>
  p.price !== null && p.availability !== 'out_of_stock' && p.availability !== 'coming_soon' && (p.stock === null || p.stock > 0);

export const availabilityLabel: Record<Availability, string> = {
  in_stock: 'Disponible',
  low_stock: 'Dernières pièces',
  made_to_order: 'Imprimé à la commande',
  out_of_stock: 'Épuisé',
  coming_soon: 'Bientôt disponible',
};

const fmt = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: settings.currency });
export const formatPrice = (cents: number | null) => (cents === null ? 'Prix à venir' : fmt.format(cents / 100));
