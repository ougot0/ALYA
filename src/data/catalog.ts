import type { Availability, Product, Settings } from './types';
import settingsJson from '../../content/settings.json';

/** Source unique : les fichiers JSON de /content, éditables à la main ou via /admin (Decap CMS). */
const modules = import.meta.glob<Product>('../../content/products/*.json', { eager: true, import: 'default' });

export const settings = settingsJson as Settings;

export const allProducts: Product[] = Object.values(modules)
  .filter((p) => !p.hidden)
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
