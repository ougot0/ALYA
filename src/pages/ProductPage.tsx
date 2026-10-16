import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DepthProduct } from '../components/DepthProduct';
import { ProductCard } from '../components/ProductCard';
import { Seo } from '../components/Seo';
import { availabilityLabel, formatPrice, getCategory, getProduct, imagesFor, isPurchasable, settings } from '../data/catalog';
import { useCart } from '../lib/cart';
import NotFound from './NotFound';

export default function ProductPage() {
  const { slug = '' } = useParams();
  const p = getProduct(slug);
  const { dispatch } = useCart();
  const [view, setView] = useState(0);
  const [color, setColor] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [zoom, setZoom] = useState(false);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    setView(0);
    setQty(1);
    setColor(p?.colors.find((c) => c.available)?.name ?? null);
  }, [slug, p]);

  if (!p) return <NotFound />;
  const views = imagesFor(p, color);
  const img = views[view] ?? views[0];
  const glow = p.light && color ? p.light[color] : undefined;
  const cat = getCategory(p.category);
  const buyable = isPurchasable(p);
  const needsColor = p.colors.length > 0;
  const maxQty = p.stock ?? 20;

  const add = () => {
    if (!buyable || (needsColor && !color)) return;
    dispatch({ type: 'add', slug: p.slug, color, qty });
    setAdded(true);
    setTimeout(() => setAdded(false), 2400);
  };

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    description: p.shortDescription,
    image: p.images.map((i) => new URL(i.src, location.origin).href),
    category: cat?.name,
    brand: { '@type': 'Brand', name: settings.brandName },
    ...(p.price !== null && {
      offers: {
        '@type': 'Offer',
        price: (p.price / 100).toFixed(2),
        priceCurrency: settings.currency,
        availability: buyable ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      },
    }),
  };

  return (
    <article className="product">
      <Seo title={p.name} description={p.shortDescription} image={img?.src} />
      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>

      <nav className="crumbs" aria-label="Fil d’Ariane">
        <Link to="/boutique">Boutique</Link> / {cat && <Link to={`/boutique/${cat.slug}`}>{cat.name}</Link>} / <span aria-current="page">{p.name}</span>
      </nav>

      <div className="product__visual">
        <div className="product__stage" style={{ viewTransitionName: `p-${p.slug}` }}>
          {glow && <span className="showroom__lamp" style={{ ['--lamp' as string]: glow }} aria-hidden="true" />}
          <span className="showroom__floor" aria-hidden="true" />
          {img ? (
            <DepthProduct
              key={img.src}
              image={img.src}
              depthMap={img.depth}
              mask={img.mask}
              alt={img.alt}
              depthIntensity={p.depth?.intensity}
              parallax={(p.depth?.parallax ?? 1) * 1.2}
              scale={p.depth?.scale}
              animation={{ follow: 'drag', float: 0.6 }}
              light={{ direction: [-0.6, 0.7, 1], strength: 0.6, ambient: 0.66, rimStrength: 0.2, spec: 0.16 }}
              bleed={8}
              eager
            />
          ) : (
            <div className="pcard__noimg">Visuel à venir</div>
          )}
          {img && (
            <button className="product__zoom" onClick={() => setZoom(true)}>
              Agrandir
            </button>
          )}
          {img?.depth && <p className="product__hint">Faites glisser pour changer de point de vue</p>}
        </div>
        {views.length > 1 && (
          <ul className="product__thumbs" aria-label="Autres vues">
            {views.map((im, i) => (
              <li key={im.src}>
                <button aria-pressed={i === view} onClick={() => setView(i)} aria-label={`Vue ${i + 1} : ${im.alt}`}>
                  <img src={im.src} alt="" loading="lazy" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="product__buy">
        <p className="eyebrow">{cat?.name}</p>
        <h1>{p.name}</h1>
        <p className="product__short">{p.shortDescription}</p>
        <p className="product__price">{formatPrice(p.price)}</p>
        <p className={`product__avail product__avail--${p.availability}`}>
          {availabilityLabel[p.availability]}
          {p.stock !== null && p.stock > 0 && p.stock <= 5 && ` · ${p.stock} en stock`}
        </p>

        {needsColor && (
          <fieldset className="swatches">
            <legend>Couleur{color ? ` : ${color}` : ''}</legend>
            {p.colors.map((c) => (
              <label key={c.name} className="swatch" title={c.available ? c.name : `${c.name} (indisponible)`}>
                <input
                  type="radio"
                  name="color"
                  value={c.name}
                  checked={color === c.name}
                  disabled={!c.available}
                  onChange={() => { setColor(c.name); setView(0); }}
                />
                <span style={{ background: c.hex }} />
                <span className="sr-only">{c.name}</span>
              </label>
            ))}
          </fieldset>
        )}

        {buyable ? (
          <div className="product__actions">
            <div className="qty" role="group" aria-label="Quantité">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Diminuer">−</button>
              <input
                type="number"
                min={1}
                max={maxQty}
                value={qty}
                onChange={(e) => setQty(Math.max(1, Math.min(maxQty, Number(e.target.value) || 1)))}
                aria-label="Quantité"
              />
              <button onClick={() => setQty((q) => Math.min(maxQty, q + 1))} aria-label="Augmenter">+</button>
            </div>
            <button className="btn btn--solid" onClick={add} disabled={needsColor && !color}>
              Ajouter au panier
            </button>
          </div>
        ) : (
          <p className="product__note">
            {p.price === null
              ? 'Cet objet n’est pas encore en vente. Son prix sera communiqué à l’ouverture.'
              : 'Cet objet n’est pas disponible pour le moment.'}{' '}
            <Link to="/contact">Nous écrire</Link>
          </p>
        )}
        <p className="product__added" role="status" aria-live="polite">
          {added && (<>Ajouté au panier. <Link to="/panier">Voir le panier</Link></>)}
        </p>

        <dl className="specs">
          <div><dt>Dimensions</dt><dd>{p.dimensions || 'À préciser'}</dd></div>
          <div><dt>Matériaux</dt><dd>{p.materials || 'À préciser'}</dd></div>
          <div><dt>Livraison</dt><dd>{settings.shippingInfo || <Link to="/livraison-retours">Conditions bientôt communiquées</Link>}</dd></div>
        </dl>
      </div>

      <section className="product__story" aria-labelledby="story-title">
        <h2 id="story-title" className="eyebrow">Description</h2>
        {p.description.split('\n\n').map((para, i) => <p key={i}>{para}</p>)}
        {p.usages.length > 0 && (
          <ol className="product__usages">
            {p.usages.map((u) => (
              <li key={u.title}>
                                <h3>{u.title}</h3>
                <p>{u.text}</p>
              </li>
            ))}
          </ol>
        )}
      </section>

      {p.related.length > 0 && (
        <section className="product__related" aria-labelledby="related-title">
          <h2 id="related-title" className="eyebrow">À associer</h2>
          <div className="shop__grid">
            {p.related.map((s) => getProduct(s)).filter(Boolean).map((r, i) => (
              <ProductCard key={r!.slug} product={r!} index={i} />
            ))}
          </div>
        </section>
      )}

      {zoom && img && <Zoom src={img.src} alt={img.alt} onClose={() => setZoom(false)} />}
    </article>
  );
}

function Zoom({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [origin, setOrigin] = useState('50% 50%');
  const [scaled, setScaled] = useState(true);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.documentElement.classList.add('menu-open');
    return () => {
      window.removeEventListener('keydown', onKey);
      document.documentElement.classList.remove('menu-open');
      prev?.focus();
    };
  }, [onClose]);
  return (
    <div className="zoom" role="dialog" aria-modal="true" aria-label="Vue agrandie" tabIndex={-1} ref={ref}>
      <button className="zoom__close" onClick={onClose}>Fermer</button>
      <div
        className="zoom__area"
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
        }}
        onClick={() => setScaled((s) => !s)}
      >
        <img src={src} alt={alt} style={{ transformOrigin: origin, transform: `scale(${scaled ? 2.2 : 1})` }} />
      </div>
    </div>
  );
}
