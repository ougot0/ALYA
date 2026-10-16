import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useGSAP } from '@gsap/react';
import { Customization } from '../components/Customization';
import { DepthProduct } from '../components/DepthProduct';
import { PrinterIntro } from '../components/PrinterIntro';
import { Process } from '../components/Process';
import { Seo } from '../components/Seo';
import { Showroom } from '../components/Showroom';
import { allProducts, getCategory, imagesFor, productsIn, settings } from '../data/catalog';
import type { DepthMotion } from '../three/DepthScene';
import { gsap, ScrollTrigger } from '../lib/gsap';

/** Les deux catégories mises en avant ; les autres forment le dernier panneau de l'atelier. */
const MAIN = ['lampes', 'supports'];

/*
 * Parcours au défilement (GSAP ScrollTrigger) :
 *   1. Intro épinglée : l'impression se joue seule, puis le défilement fait avancer la caméra vers le logo.
 *   2. Atelier : piste horizontale épinglée ; chaque objet avance vers le visiteur en passant au centre.
 *   3. Showroom : entrée en profondeur, puis navigation aux flèches.
 *   4. Fabrication : épinglée, 4 étapes avec aimantation sur chaque étape.
 *   5. Personnalisation : apparition en cascade.
 * Desktop / mobile / réduction des animations : gsap.matchMedia.
 */
export default function Home() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        // titres de section : montée depuis un masque, rejouée à l'envers en remontant
        gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
          gsap.from(el, {
            yPercent: 60,
            autoAlpha: 0,
            duration: 0.9,
            ease: 'power3.out',
            scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none reverse' },
          });
        });
      });
      // les canvases et images chargés en différé peuvent décaler les positions
      const t = window.setTimeout(() => ScrollTrigger.refresh(), 600);
      return () => window.clearTimeout(t);
    },
    { scope: root },
  );

  return (
    <div ref={root}>
      <Seo description={`${settings.brandName} Impression 3D — lampes, supports et créations personnalisées imprimées en 3D.`} />
      <Intro />
      <Atelier />
      <ShowroomEntrance />
      <Process />
      <Customization />
    </div>
  );
}

/* ------------------------------------------------------------- 1. Intro */

function Intro() {
  const root = useRef<HTMLElement>(null);
  const [printed, setPrinted] = useState(false);
  const [skip, setSkip] = useState(false);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(
        { desktop: '(min-width: 900px)', motion: '(prefers-reduced-motion: no-preference)' },
        (ctx) => {
          const { desktop, motion } = ctx.conditions as { desktop: boolean; motion: boolean };
          if (!motion) return;
          // la caméra avance vers le logo, l'imprimante sort du cadre
          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: root.current,
              start: 'top top',
              end: desktop ? '+=85%' : 'bottom top',
              pin: desktop,
              scrub: 0.8,
            },
          });
          tl.to('.intro__scene', { scale: desktop ? 2.1 : 1.5, yPercent: desktop ? 12 : 0, ease: 'power2.in' }, 0)
            .to('.intro__scene', { autoAlpha: 0, ease: 'power1.in', duration: 0.35 }, 0.65)
            .to('.intro__brand > *', { yPercent: -60, autoAlpha: 0, stagger: 0.06, ease: 'power1.in', duration: 0.5 }, 0);
        },
      );
    },
    { scope: root },
  );

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
        <p className="intro__lead">Lampes et supports imprimés en 3D, chacun en trois couleurs. Créations sur demande.</p>
        <div className="intro__cta">
          <a href="#showroom" className="btn btn--solid">Voir les objets</a>
          <a href="#personnalisation" className="link-arrow">Demander une création</a>
        </div>
      </div>
      <p className="intro__scroll" aria-hidden="true">Faites défiler pour entrer dans l’atelier</p>
    </section>
  );
}

/* ----------------------------------------------- 2. Atelier (horizontal) */

function Atelier() {
  const root = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const motions = useRef<DepthMotion[]>(MAIN.map(() => ({ x: 0, y: 0, push: -0.4 })));
  const secondary = settings.categories.filter((c) => !MAIN.includes(c.slug));

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      const panels = gsap.utils.toArray<HTMLElement>('.atelier__panel');

      mm.add(
        { desktop: '(min-width: 900px)', motion: '(prefers-reduced-motion: no-preference)' },
        (ctx) => {
          const { desktop, motion } = ctx.conditions as { desktop: boolean; motion: boolean };
          if (!motion) {
            motions.current.forEach((m) => (m.push = 0.2));
            return;
          }
          if (desktop) {
            // piste horizontale épinglée : la distance défilée = la largeur à parcourir
            const distance = () => track.current!.scrollWidth - window.innerWidth;
            const move = gsap.to(track.current, {
              x: () => -distance(),
              ease: 'none',
              scrollTrigger: {
                trigger: root.current,
                start: 'top top',
                end: () => '+=' + distance(),
                pin: true,
                scrub: 1,
                invalidateOnRefresh: true,
                // aimantation sur le début de chaque panneau (largeurs inégales : points calculés)
                snap: {
                  snapTo: (v: number) => gsap.utils.snap(panels.map((pn) => Math.min(1, pn.offsetLeft / distance())), v),
                  duration: { min: 0.25, max: 0.7 },
                  delay: 0.1,
                  ease: 'power2.inOut',
                },
              },
            });
            // dans chaque panneau, l'objet avance en passant au centre et pivote légèrement
            panels.forEach((panel, i) => {
              const m = motions.current[i];
              if (m) {
                gsap.timeline({
                  scrollTrigger: { trigger: panel, containerAnimation: move, start: 'left right', end: 'right left', scrub: true },
                })
                  .fromTo(m, { push: -0.6, x: 0.7 }, { push: 0.9, x: 0, ease: 'power1.out', duration: 0.5 })
                  .to(m, { push: -0.2, x: -0.7, ease: 'power1.in', duration: 0.5 });
              }
              // le texte glisse moins vite que l'objet : deux plans de profondeur
              gsap.fromTo(
                panel.querySelector('.atelier__text'),
                { xPercent: 35 },
                { xPercent: -35, ease: 'none', scrollTrigger: { trigger: panel, containerAnimation: move, start: 'left right', end: 'right left', scrub: true } },
              );
            });
          } else {
            // mobile : panneaux empilés, l'objet avance pendant que le panneau traverse l'écran
            panels.forEach((panel, i) => {
              const m = motions.current[i];
              if (!m) return;
              gsap.fromTo(m, { push: -0.5 }, { push: 0.7, ease: 'none', scrollTrigger: { trigger: panel, start: 'top 90%', end: 'bottom 30%', scrub: 0.6 } });
            });
          }
        },
      );
    },
    { scope: root },
  );

  return (
    <section className="atelier" ref={root} aria-labelledby="atelier-title">
      <h2 id="atelier-title" className="sr-only">L’atelier</h2>
      <div className="atelier__track" ref={track}>
        {MAIN.map((slug, i) => {
          const cat = getCategory(slug);
          const p = productsIn(slug).find((x) => x.featured) ?? productsIn(slug)[0];
          const img = p ? imagesFor(p, p.colors[0]?.name ?? null)[0] : undefined;
          if (!cat) return null;
          return (
            <article key={slug} className="atelier__panel">
              <div className="atelier__bay" aria-hidden="true" />
              <div className="atelier__object">
                {img && (
                  <DepthProduct
                    image={img.src}
                    depthMap={img.depth}
                    alt={img.alt}
                    depthIntensity={p?.depth?.intensity}
                    motion={{ current: motions.current[i] }}
                    bleed={22}
                    animation={{ float: 0.8 }}
                    light={{ direction: [-0.6, 0.7, 1], strength: 0.6, ambient: 0.66, rimStrength: 0.2, spec: 0.14 }}
                  />
                )}
              </div>
              <div className="atelier__text">
                <h3 className="atelier__title">{cat.name}</h3>
                <p>{cat.description}</p>
                <Link to={`/boutique/${cat.slug}`} className="link-arrow">Voir les {cat.name.toLowerCase()}</Link>
              </div>
            </article>
          );
        })}
        <article className="atelier__panel atelier__panel--more">
          <div className="atelier__text">
            <h3 className="atelier__title">Et aussi</h3>
            <ul className="atelier__more">
              {secondary.map((c) => {
                const n = productsIn(c.slug).length;
                return (
                  <li key={c.slug}>
                    <Link to={`/boutique/${c.slug}`}>
                      {c.name} <span>{n ? `${n} objet${n > 1 ? 's' : ''}` : 'bientôt'}</span>
                    </Link>
                  </li>
                );
              })}
              <li><a href="#personnalisation">Créations personnalisées <span>sur demande</span></a></li>
            </ul>
          </div>
        </article>
      </div>
    </section>
  );
}

/* -------------------------------------------- 3. Entrée du showroom */

function ShowroomEntrance() {
  const root = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        // la scène arrive depuis le fond : échelle et profondeur, sans retarder l'accès aux boutons
        gsap.timeline({ scrollTrigger: { trigger: root.current, start: 'top 90%', end: 'top 25%', scrub: 0.8 } })
          .fromTo('.showroom__stage', { scale: 0.82, yPercent: 8, autoAlpha: 0.2 }, { scale: 1, yPercent: 0, autoAlpha: 1, ease: 'power2.out' }, 0)
          .fromTo('.showroom__head', { yPercent: 60, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, ease: 'power2.out' }, 0);
      });
    },
    { scope: root },
  );
  return (
    <div ref={root}>
      <Showroom products={allProducts} heading="Les objets" />
    </div>
  );
}
