import { useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Customization } from '../components/Customization';
import { DepthProduct } from '../components/DepthProduct';
import { PrinterIntro } from '../components/PrinterIntro';
import { Seo } from '../components/Seo';
import { Showroom } from '../components/Showroom';
import { allProducts, getCategory, imagesFor, productsIn, settings } from '../data/catalog';
import type { DepthMotion } from '../three/DepthScene';
import { gsap } from '../lib/gsap';
import { useReducedMotion } from '../lib/motion';

/** Les deux catégories mises en avant ; les autres deviennent des liens secondaires. */
const MAIN = ['lampes', 'supports'];

export default function Home() {
  return (
    <>
      <Seo description={`${settings.brandName} Impression 3D — lampes, supports et créations personnalisées imprimées en 3D.`} />
      <Intro />
      <Zones />
      <Showroom products={allProducts} heading="Showroom" />
      <Customization />
    </>
  );
}

/* ------------------------------------------------------------- Intro */

function Intro() {
  const root = useRef<HTMLElement>(null);
  const [printed, setPrinted] = useState(false);
  const [skip, setSkip] = useState(false);
  const reduced = useReducedMotion();

  // en quittant l'introduction, la caméra avance dans l'atelier
  useLayoutEffect(() => {
    if (reduced) return;
    const ctx = gsap.context(() => {
      gsap.timeline({ scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: 0.5 } })
        .to('.intro__scene', { scale: 1.45, yPercent: -8, autoAlpha: 0, ease: 'power1.in' }, 0)
        .to('.intro__brand', { yPercent: -40, autoAlpha: 0, ease: 'none' }, 0);
    }, root);
    return () => ctx.revert();
  }, [reduced]);

  return (
    <section className={`intro ${printed ? 'is-printed' : ''}`} ref={root} aria-labelledby="intro-title">
      <div className="intro__scene">
        <PrinterIntro text={settings.brandName} skip={skip} onDone={() => setPrinted(true)} />
      </div>
      {!printed && (
        <button className="intro__skip" onClick={() => setSkip(true)}>Passer l’introduction</button>
      )}
      <div className="intro__brand">
        <h1 id="intro-title" className="intro__title">
          {settings.brandName} <span>Impression 3D</span>
        </h1>
        <p className="intro__lead">Lampes, supports et objets du quotidien, imprimés couche par couche dans notre atelier.</p>
        <div className="intro__cta">
          <a href="#showroom" className="btn btn--solid">Entrer dans le showroom</a>
          <a href="#personnalisation" className="link-arrow">Créations personnalisées</a>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- Zones */

function Zones() {
  const secondary = settings.categories.filter((c) => !MAIN.includes(c.slug));
  return (
    <section className="zones" aria-labelledby="zones-title">
      <h2 id="zones-title" className="sr-only">Les créations</h2>
      {MAIN.map((slug, i) => <Zone key={slug} slug={slug} side={i % 2 ? 'right' : 'left'} index={i} />)}
      <nav className="zones__more" aria-label="Autres créations">
        <p className="eyebrow">Également à l’atelier</p>
        <ul>
          {secondary.map((c) => {
            const n = productsIn(c.slug).length;
            return (
              <li key={c.slug}>
                <Link to={`/boutique/${c.slug}`}>
                  {c.name} <span>{n ? `${n} objet${n > 1 ? 's' : ''}` : 'Bientôt'}</span>
                </Link>
              </li>
            );
          })}
          <li><a href="#personnalisation">Créations personnalisées <span>Sur demande</span></a></li>
        </ul>
      </nav>
    </section>
  );
}

function Zone({ slug, side, index }: { slug: string; side: 'left' | 'right'; index: number }) {
  const cat = getCategory(slug);
  const p = productsIn(slug).find((x) => x.featured) ?? productsIn(slug)[0];
  const root = useRef<HTMLElement>(null);
  const motion = useRef<DepthMotion>({ x: 0, y: 0, push: -0.4 });
  const reduced = useReducedMotion();

  // au défilement, l'objet avance vers le visiteur et dépasse de sa zone
  useLayoutEffect(() => {
    const m = motion.current;
    if (reduced) { m.push = 0.2; return; }
    const ctx = gsap.context(() => {
      gsap.timeline({ scrollTrigger: { trigger: root.current, start: 'top 85%', end: 'bottom 20%', scrub: 0.6 } })
        .fromTo(m, { push: -0.5, x: side === 'left' ? 0.5 : -0.5 }, { push: 0.75, x: side === 'left' ? -0.4 : 0.4, ease: 'none' }, 0)
        .fromTo('.zone__name', { xPercent: side === 'left' ? -6 : 6 }, { xPercent: side === 'left' ? 4 : -4, ease: 'none' }, 0)
        .fromTo('.zone__frame', { scale: 0.94 }, { scale: 1.02, ease: 'none' }, 0);
    }, root);
    return () => ctx.revert();
  }, [reduced, side]);

  if (!cat) return null;
  const img = p ? imagesFor(p, p.colors[0]?.name ?? null)[0] : undefined;
  const glow = p?.light && p.colors[0] ? p.light[p.colors[0].name] : undefined;

  return (
    <article className={`zone zone--${side}`} ref={root}>
      <p className="zone__name" aria-hidden="true">{cat.name}</p>
      <div className="zone__frame" aria-hidden="true" />
      <div className="zone__object">
        {glow && <span className="showroom__lamp" style={{ ['--lamp' as string]: glow }} aria-hidden="true" />}
        {img && (
          <DepthProduct
            image={img.src}
            depthMap={img.depth}
            alt={img.alt}
            depthIntensity={p?.depth?.intensity}
            motion={motion}
            bleed={24}
            animation={{ float: 0.8, drift: side === 'left' ? 0.12 : -0.12 }}
            light={{ direction: [-0.6, 0.7, 1], strength: 0.6, ambient: 0.66, rimStrength: 0.45, spec: 0.14 }}
          />
        )}
      </div>
      <div className="zone__text">
        <p className="eyebrow">{String(index + 1).padStart(2, '0')} — {cat.name}</p>
        <h3 className="zone__title">{cat.name}</h3>
        <p>{cat.description}</p>
        <Link to={`/boutique/${cat.slug}`} className="link-arrow">Explorer les {cat.name.toLowerCase()}</Link>
      </div>
    </article>
  );
}
