import { useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { DepthProduct } from '../components/DepthProduct';
import { ProductCard } from '../components/ProductCard';
import { Seo } from '../components/Seo';
import { allProducts, getProduct, productsIn, settings } from '../data/catalog';
import type { DepthMotion } from '../three/DepthScene';
import { gsap, ScrollTrigger } from '../lib/gsap';
import { useReducedMotion } from '../lib/motion';

export default function Home() {
  const hero = allProducts.find((p) => p.featured && p.category === 'lampes') ?? allProducts[0];
  const staged = getProduct('support-trame') ?? allProducts.find((p) => p.usages.length > 0);
  return (
    <>
      <Seo description={`${settings.brandName} — lampes, supports et objets imprimés en 3D, dessinés comme des objets de design.`} />
      {hero && <Hero slug={hero.slug} />}
      <Creations />
      {staged && staged.usages.length > 0 && <Usages slug={staged.slug} />}
      <Process />
      <CollectionIndex />
      <section className="closing">
        <p className="eyebrow">Fin de la visite</p>
        <Link to="/boutique" className="closing__link">
          Voir toute la boutique <span aria-hidden="true" className="closing__rule" />
        </Link>
      </section>
    </>
  );
}

/* ------------------------------------------------------------------ Hero */

function Hero({ slug }: { slug: string }) {
  const p = getProduct(slug)!;
  const img = p.images[0];
  const root = useRef<HTMLElement>(null);
  const motion = useRef<DepthMotion>({ x: 0, y: 0, push: -0.35 });
  const reduced = useReducedMotion();

  useLayoutEffect(() => {
    const el = root.current!;
    const m = motion.current;
    if (reduced) { m.push = 0; return; }
    const ctx = gsap.context(() => {
      // introduction : courte, n'empêche ni le défilement ni les clics
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.from('.hero__arch', { clipPath: 'inset(100% 0 0 0)', duration: 1.1 })
        .from('.hero__line > span', { yPercent: 110, duration: 0.9, stagger: 0.08 }, 0.15)
        .to(m, { push: 0, duration: 1.6, ease: 'power2.out' }, 0.2)
        .from('.hero__aside > *', { opacity: 0, y: 12, duration: 0.6, stagger: 0.06 }, 0.6);

      // pointeur : léger parallaxe, sauf pendant l'avancée
      const onMove = (e: PointerEvent) => {
        m.x = (e.clientX / innerWidth) * 2 - 1;
        m.y = (e.clientY / innerHeight) * 2 - 1;
      };
      window.addEventListener('pointermove', onMove, { passive: true });

      const mm = gsap.matchMedia();
      mm.add('(min-width: 900px)', () => {
        const st = gsap.timeline({
          scrollTrigger: { trigger: el, start: 'top top', end: '+=90%', pin: true, scrub: 0.6 },
        });
        st.to(m, { push: 1, ease: 'none' }, 0)
          .to('.hero__line', { yPercent: -22, ease: 'none' }, 0)
          .to('.hero__aside', { opacity: 0, ease: 'none', duration: 0.5 }, 0)
          .to('.hero__arch', { scale: 0.94, ease: 'none' }, 0)
          .to('.hero__shadow', { scaleX: 1.35, opacity: 0.32, ease: 'none' }, 0);
      });
      mm.add('(max-width: 899px)', () => {
        gsap.timeline({ scrollTrigger: { trigger: el, start: 'top top', end: 'bottom 30%', scrub: 0.5 } })
          .to(m, { push: 0.8, ease: 'none' }, 0)
          .to('.hero__shadow', { scaleX: 1.25, opacity: 0.3, ease: 'none' }, 0);
      });
      return () => window.removeEventListener('pointermove', onMove);
    }, el);
    return () => ctx.revert();
  }, [reduced]);

  return (
    <section className="hero" ref={root} aria-labelledby="hero-title">
      <h1 className="hero__title" id="hero-title">
        <span className="hero__line"><span>La lumière,</span></span>
        <span className="hero__line hero__line--behind"><span>couche</span></span>
        <span className="hero__line hero__line--front"><span><em>par couche.</em></span></span>
      </h1>
      <div className="hero__stage">
        <div className="hero__arch" aria-hidden="true" />
        <div className="hero__shadow" aria-hidden="true" />
        <DepthProduct
          className="hero__product"
          image={img.src}
          depthMap={img.depth}
          alt={img.alt}
          depthIntensity={(p.depth?.intensity ?? 0.3) * 0.75}
          motion={motion}
          bleed={40}
          eager
          animation={{ float: 1, drift: -0.42 }}
          light={{ direction: [-0.7, 0.5, 1], strength: 0.65 }}
        />
      </div>
      <div className="hero__aside">
        <p className="eyebrow">N°01 — {p.name}</p>
        <p className="hero__desc">{p.shortDescription}</p>
        <Link to={`/produit/${p.slug}`} className="btn" viewTransition>
          Découvrir la lampe
        </Link>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- Créations */

function Creations() {
  const items = allProducts.slice(0, 5);
  return (
    <section className="creations" aria-labelledby="creations-title">
      <header className="section-head">
        <p className="eyebrow">01 — Les créations</p>
        <h2 id="creations-title">Des objets à poser, à utiliser, à regarder.</h2>
      </header>
      <div className="creations__spread">
        {items.map((p, i) => (
          <ProductCard key={p.slug} product={p} index={i} variant={i === 0 ? 'large' : 'offset'} />
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------- Mise en scène */

function Usages({ slug }: { slug: string }) {
  const p = getProduct(slug)!;
  const img = p.images[0];
  const [active, setActive] = useState(0);
  const motion = useRef<DepthMotion>({ x: 0, y: 0, push: 0 });
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('.usages__step').forEach((step, i) => {
        ScrollTrigger.create({
          trigger: step,
          start: 'top 60%',
          end: 'bottom 60%',
          onToggle: (s) => s.isActive && setActive(i),
        });
      });
    }, root);
    return () => ctx.revert();
  }, []);

  // l'objet se tourne légèrement vers la zone décrite
  const u = p.usages[active];
  motion.current.x = (u.x - 0.5) * 1.6;
  motion.current.y = (u.y - 0.5) * 1.2;
  motion.current.push = 0.25;

  return (
    <section className="usages" ref={root} aria-labelledby="usages-title">
      <div className="usages__sticky">
        <div className="usages__stage">
          <DepthProduct
            image={img.src}
            depthMap={img.depth}
            alt={img.alt}
            depthIntensity={p.depth?.intensity}
            motion={motion}
            bleed={10}
          />
          <div className="usages__pins">
          {p.usages.map((us, i) => (
            <span
              key={us.title}
              className={`usages__pin ${i === active ? 'is-active' : ''}`}
              style={{ left: `${us.x * 100}%`, top: `${us.y * 100}%` }}
              aria-hidden="true"
            >
              {String(i + 1).padStart(2, '0')}
            </span>
          ))}
          </div>
        </div>
      </div>
      <div className="usages__text">
        <header className="section-head">
          <p className="eyebrow">02 — {p.name}</p>
          <h2 id="usages-title">Un seul support, quatre usages.</h2>
          <p>{p.shortDescription}</p>
        </header>
        <ol className="usages__list">
          {p.usages.map((us, i) => (
            <li key={us.title} className={`usages__step ${i === active ? 'is-active' : ''}`}>
              <span className="usages__num">{String(i + 1).padStart(2, '0')}</span>
              <h3>{us.title}</h3>
              <p>{us.text}</p>
            </li>
          ))}
        </ol>
        <Link to={`/produit/${p.slug}`} className="link-arrow" viewTransition>
          Voir le support {p.name.replace(/^Support\s+/, '')}
        </Link>
      </div>
    </section>
  );
}

/* --------------------------------------------------------- Fabrication */

const STEPS = [
  { t: 'Dessin', d: 'Chaque objet est d’abord modélisé en 3D : proportions, épaisseurs, points d’appui.' },
  { t: 'Préparation', d: 'Le modèle est découpé en fines couches horizontales qui deviennent les trajectoires de l’imprimante.' },
  { t: 'Impression', d: 'La buse dépose le filament fondu, couche après couche, jusqu’à construire la forme complète.' },
  { t: 'Finition', d: 'La pièce est détachée du plateau, nettoyée et vérifiée avant expédition.' },
];

export function Process({ standalone = false }: { standalone?: boolean }) {
  const root = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const LAYERS = 46;

  useLayoutEffect(() => {
    if (reduced) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: { trigger: '.process__figure', start: 'top 75%', end: 'bottom 35%', scrub: 0.4 },
      });
      tl.fromTo('.process__layers', { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', ease: 'none' }, 0)
        .fromTo('.process__nozzle', { yPercent: 0 }, { y: () => -(root.current!.querySelector('.process__figure') as HTMLElement).clientHeight * 0.86, ease: 'none' }, 0);
    }, root);
    return () => ctx.revert();
  }, [reduced]);

  // profil d'abat-jour + pied, en couches
  const rows = Array.from({ length: LAYERS }, (_, i) => {
    const t = i / (LAYERS - 1); // 0 en bas
    let w: number;
    if (t < 0.06) w = 0.42;
    else if (t < 0.5) w = 0.035;
    else w = 0.86 - ((t - 0.5) / 0.5) * 0.5;
    return { y: 96 - t * 88, w };
  });

  return (
    <section className={`process ${standalone ? 'process--page' : ''}`} ref={root} aria-labelledby="process-title">
      <header className="section-head">
        <p className="eyebrow">{standalone ? 'Fabrication' : '03 — Fabrication'}</p>
        <h2 id="process-title">Comment un objet est imprimé.</h2>
      </header>
      <figure className="process__figure" aria-hidden="true">
        <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" className="process__layers">
          {rows.map((r, i) => (
            <line key={i} x1={50 - r.w * 50} x2={50 + r.w * 50} y1={r.y} y2={r.y} />
          ))}
        </svg>
        <span className="process__nozzle" />
        <span className="process__bed" />
      </figure>
      <ol className="process__steps">
        {STEPS.map((s, i) => (
          <li key={s.t}>
            <span className="process__num">{String(i + 1).padStart(2, '0')}</span>
            <h3>{s.t}</h3>
            <p>{s.d}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ---------------------------------------------------------- Collection */

function CollectionIndex() {
  return (
    <section className="collection" aria-labelledby="collection-title">
      <header className="section-head">
        <p className="eyebrow">04 — La collection</p>
        <h2 id="collection-title">Par catégorie</h2>
      </header>
      <ul className="collection__list">
        {settings.categories.map((c, i) => {
          const n = productsIn(c.slug).length;
          return (
            <li key={c.slug}>
              <Link to={`/boutique/${c.slug}`} className="collection__row">
                <span className="collection__num">{String(i + 1).padStart(2, '0')}</span>
                <span className="collection__name">{c.name}</span>
                <span className="collection__desc">{c.description}</span>
                <span className="collection__count">{n ? `${n} objet${n > 1 ? 's' : ''}` : 'À venir'}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
