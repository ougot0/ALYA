import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Product } from '../data/types';
import { availabilityLabel, formatPrice, getCategory } from '../data/catalog';
import { DepthProduct } from './DepthProduct';

interface Props {
  product: Product;
  index: number;
  variant?: 'large' | 'offset' | 'grid';
}

/**
 * Carte éditoriale : pas de bloc blanc ni de bouton arrondi.
 * Le relief WebGL n'est monté qu'au survol (pointeur fin) pour ne garder
 * qu'un contexte WebGL actif à la fois dans les listes.
 */
export function ProductCard({ product: p, index, variant = 'grid' }: Props) {
  const [hover, setHover] = useState(false);
  const img = p.images[0];
  const fine = typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  return (
    <article
      className={`pcard pcard--${variant}`}
      onPointerEnter={() => fine && setHover(true)}
      onPointerLeave={() => setHover(false)}
    >
      <Link to={`/produit/${p.slug}`} className="pcard__link" viewTransition>
        <div className="pcard__media" style={{ viewTransitionName: `p-${p.slug}` }}>
          {hover && img?.depth ? (
            <DepthProduct image={img.src} depthMap={img.depth} alt={img.alt} depthIntensity={(p.depth?.intensity ?? 0.3) * 0.8} parallax={0.7} eager bleed={6} />
          ) : img ? (
            <img src={img.src} alt={img.alt} loading={index < 2 ? 'eager' : 'lazy'} decoding="async" />
          ) : (
            <div className="pcard__noimg">Visuel à venir</div>
          )}
        </div>
        <div className="pcard__meta">
          <span className="pcard__num">{String(index + 1).padStart(2, '0')}</span>
          <h3 className="pcard__name">{p.name}</h3>
          <p className="pcard__cat">{getCategory(p.category)?.name}</p>
          {variant !== 'grid' && <p className="pcard__desc">{p.shortDescription}</p>}
          <p className="pcard__price">
            {formatPrice(p.price)} <span className="pcard__avail">· {availabilityLabel[p.availability]}</span>
          </p>
        </div>
      </Link>
    </article>
  );
}
