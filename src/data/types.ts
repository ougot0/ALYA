export type Availability = 'in_stock' | 'low_stock' | 'made_to_order' | 'out_of_stock' | 'coming_soon';

export interface ProductImage {
  src: string;
  depth?: string;
  mask?: string;
  alt: string;
  /** Variante de couleur représentée par ce visuel */
  color?: string;
}

export interface ProductColor {
  name: string;
  hex: string;
  available: boolean;
}

export interface ProductUsage {
  title: string;
  text: string;
  /** Position du repère sur l'image, de 0 à 1 */
  x: number;
  y: number;
}

export interface DepthSettings {
  intensity?: number;
  parallax?: number;
  scale?: number;
}

export interface Product {
  slug: string;
  name: string;
  category: string;
  shortDescription: string;
  description: string;
  /** Prix en centimes. null = prix non communiqué, produit non achetable. */
  price: number | null;
  createdAt: string;
  availability: Availability;
  stock: number | null;
  hidden: boolean;
  featured: boolean;
  colors: ProductColor[];
  dimensions: string;
  materials: string;
  usages: ProductUsage[];
  images: ProductImage[];
  depth?: DepthSettings;
  model3d?: string;
  /** Lumière interne visible (lampes) : couleur de la lumière par variante */
  light?: Record<string, string>;
  related: string[];
}

export interface Category {
  slug: string;
  name: string;
  description: string;
}

export interface Settings {
  brandName: string;
  tagline: string;
  currency: string;
  contactEmail: string;
  instagram: string;
  shippingInfo: string;
  returnsInfo: string;
  categories: Category[];
}
