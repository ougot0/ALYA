import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent as RPointerEvent } from 'react';
import { Link } from 'react-router-dom';
import type { Product } from '../data/types';
import { availabilityLabel, formatPrice, getCategory, imagesFor, isPurchasable } from '../data/catalog';
import type { DepthMotion } from '../three/DepthScene';
import { useCart } from '../lib/cart';
import { gsap } from '../lib/gsap';
import { useReducedMotion } from '../lib/motion';
import { DepthProduct } from './DepthProduct';

interface Props {
  products: Product[];
  id?: string;
  heading?: string;
}

/**
 * Showroom : un objet à la fois, mis en scène dans l'espace.
 * Flèches (ou ← → au clavier) pour changer d'objet : l'objet courant recule et
 * sort du champ, le suivant avance depuis le côté opposé. Glisser sur l'objet
 * l'oriente dans les limites que permet une photographie (angles volontairement faibles).
 */
export function Showroom({ products, id = 'showroom', heading = 'Showroom' }: Props) {
  const [index, setIndex] = useState(0);
  const [colors, setColors] = useState<Record<string, string | null>>({});
  const [open, setOpen] = useState(false);
  const [added, setAdded] = useState(false);
  const [qty, setQty] = useState(1);
  const dirRef = useRef(0);
  const busy = useRef(false);
  const objRef = useRef<HTMLDivElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);
  const motion = useRef<DepthMotion>({ x: 0, y: 0, push: 0 });
  const drag = useRef<{ x: number; y: number; id: number } | null>(null);
  const reduced = useReducedMotion();
  const { dispatch } = useCart();

  const p = products[index % Math.max(1, products.length)];
  const color = p ? colors[p.slug] ?? p.colors.find((c) => c.available)?.name ?? null : null;
  const img = p ? imagesFor(p, color)[0] : undefined;
  const glow = p?.light && color ? p.light[color] : undefined;

  useEffect(() => { setOpen(false); setQty(1); setAdded(false); }, [index]);

  const go = useCallback(
    (dir: 1 | -1) => {
      if (busy.current || products.length < 2) return;
      const next = (index + dir + products.length) % products.length;
      if (reduced) { setIndex(next); return; }
      busy.current = true;
      dirRef.current = dir;
      const m = motion.current;
      gsap.timeline({ onComplete: () => setIndex(next) })
        .to(m, { push: -0.8, duration: 0.45, ease: 'power2.in' }, 0)
        .to(objRef.current, { xPercent: -dir * 38, scale: 0.72, autoAlpha: 0, duration: 0.45, ease: 'power2.in' }, 0)
        .to(infoRef.current, { autoAlpha: 0, y: -10, duration: 0.25 }, 0);
    },
    [index, products.length, reduced],
  );

  // entrée du nouvel objet : il avance depuis le côté opposé
  useLayoutEffect(() => {
    const dir = dirRef.current;
    if (!dir) return;
    const m = motion.current;
    m.push = 0.9;
    gsap.timeline({ onComplete: () => { busy.current = false; } })
      .fromTo(objRef.current, { xPercent: dir * 38, scale: 1.18, autoAlpha: 0 }, { xPercent: 0, scale: 1, autoAlpha: 1, duration: 0.75, ease: 'power3.out' }, 0)
      .to(m, { push: 0, duration: 1.1, ease: 'power3.out' }, 0)
      .fromTo(infoRef.current, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out' }, 0.2);
  }, [index]);

  // ---------- manipulation : cliquer-glisser / toucher ----------
  const onDown = (e: RPointerEvent<HTMLDivElement>) => {
    drag.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
    if (e.pointerType === 'mouse') e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: RPointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const m = motion.current;
    if (drag.current) {
      m.x = gsap.utils.clamp(-1, 1, ((e.clientX - drag.current.x) / r.width) * 3);
      if (e.pointerType === 'mouse') m.y = gsap.utils.clamp(-1, 1, ((e.clientY - drag.current.y) / r.height) * 3);
    } else if (e.pointerType === 'mouse') {
      // survol : simple frémissement de perspective
      m.x = (((e.clientX - r.left) / r.width) * 2 - 1) * 0.35;
      m.y = (((e.clientY - r.top) / r.height) * 2 - 1) * 0.25;
    }
  };
  const onUp = () => {
    drag.current = null;
    motion.current.x = 0;
    motion.current.y = 0;
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
  };

  if (!p) return null;
  const buyable = isPurchasable(p);
  const cat = getCategory(p.category);
  const num = (n: number) => String(n).padStart(2, '0');

  const add = () => {
    dispatch({ type: 'add', slug: p.slug, color, qty });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2600);
  };

  return (
    <section className="showroom" id={id} aria-roledescription="carrousel" aria-label={heading} onKeyDown={onKey}>
      <div className="showroom__head">
        <p className="eyebrow">{heading}</p>
        <p className="showroom__count" aria-live="polite">
          <span>{num(index + 1)}</span> / {num(products.length)}
        </p>
      </div>

      <div className="showroom__stage">
        <p className="showroom__ghost" aria-hidden="true">{p.name.split(' ')[0]}</p>
        <div
          className="showroom__space"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onPointerLeave={onUp}
        >
          <div className="showroom__object" ref={objRef}>
            {glow && <span className="showroom__lamp" style={{ ['--lamp' as string]: glow }} aria-hidden="true" />}
            <span className="showroom__floor" aria-hidden="true" />
            {img && (
              <DepthProduct
                key={img.src}
                image={img.src}
                depthMap={img.depth}
                mask={img.mask}
                alt={img.alt}
                depthIntensity={p.depth?.intensity}
                parallax={p.depth?.parallax ?? 1}
                scale={p.depth?.scale}
                motion={motion}
                animation={{ float: 1, follow: 'none' }}
                light={{ direction: [-0.6, 0.7, 1], strength: 0.6, ambient: 0.66, rimStrength: 0.45, spec: 0.16 }}
                bleed={16}
                eager
              />
            )}
          </div>
        </div>
        {products.length > 1 && (
          <>
            <button className="showroom__arrow showroom__arrow--prev" onClick={() => go(-1)} aria-label="Objet précédent">
              <svg viewBox="0 0 40 16" aria-hidden="true"><path d="M8 1 1 8l7 7M1 8h38" /></svg>
            </button>
            <button className="showroom__arrow showroom__arrow--next" onClick={() => go(1)} aria-label="Objet suivant">
              <svg viewBox="0 0 40 16" aria-hidden="true"><path d="M32 1l7 7-7 7M39 8H1" /></svg>
            </button>
          </>
        )}
        <p className="showroom__hint" aria-hidden="true">Glisser pour orienter l’objet</p>
      </div>

      <div className="showroom__info" ref={infoRef}>
        <p className="eyebrow">{cat?.name}</p>
        <h2 className="showroom__name">{p.name}</h2>
        <p className="showroom__short">{p.shortDescription}</p>

        {p.colors.length > 0 && (
          <fieldset className="swatches">
            <legend className="eyebrow">Couleur — {color}</legend>
            {p.colors.map((c) => (
              <label key={c.name} className="swatch" title={c.available ? c.name : `${c.name} (indisponible)`}>
                <input
                  type="radio"
                  name={`color-${id}-${p.slug}`}
                  checked={color === c.name}
                  disabled={!c.available}
                  onChange={() => setColors((s) => ({ ...s, [p.slug]: c.name }))}
                />
                <span style={{ background: c.hex }} />
                <span className="sr-only">{c.name}</span>
              </label>
            ))}
          </fieldset>
        )}

        <div className="showroom__buy">
          <p className="showroom__price">
            {formatPrice(p.price)}
            <span>{availabilityLabel[p.availability]}</span>
          </p>
          {buyable ? (
            <div className="showroom__actions">
              <div className="qty" role="group" aria-label="Quantité">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Diminuer">−</button>
                <output aria-live="polite">{qty}</output>
                <button onClick={() => setQty((q) => Math.min(p.stock ?? 20, q + 1))} aria-label="Augmenter">+</button>
              </div>
              <button className="btn btn--solid" onClick={add}>Ajouter au panier</button>
            </div>
          ) : (
            <p className="showroom__note">Pas encore en vente. <Link to="/contact">Être informé</Link></p>
          )}
          <p className="showroom__added" role="status">{added && <>Ajouté. <Link to="/panier">Voir le panier</Link></>}</p>
        </div>

        <button className="showroom__toggle" aria-expanded={open} aria-controls={`${id}-details`} onClick={() => setOpen((o) => !o)}>
          {open ? 'Masquer les caractéristiques' : 'Caractéristiques'}
          <span aria-hidden="true">{open ? '−' : '+'}</span>
        </button>
        <div id={`${id}-details`} className={`showroom__details ${open ? 'is-open' : ''}`} hidden={!open}>
          {p.description.split('\n\n').map((t, i) => <p key={i}>{t}</p>)}
          <dl className="specs">
            <div><dt>Dimensions</dt><dd>{p.dimensions || 'À préciser'}</dd></div>
            <div><dt>Matériaux</dt><dd>{p.materials || 'À préciser'}</dd></div>
            <div><dt>Couleurs</dt><dd>{p.colors.map((c) => c.name).join(', ') || '—'}</dd></div>
          </dl>
          <Link to={`/produit/${p.slug}`} className="link-arrow">Fiche complète</Link>
        </div>
      </div>
    </section>
  );
}
