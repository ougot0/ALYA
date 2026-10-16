import { useLayoutEffect, useRef } from 'react';
import { gsap } from '../lib/gsap';
import { useReducedMotion } from '../lib/motion';

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
        {STEPS.map((s) => (
          <li key={s.t}>
            <h3>{s.t}</h3>
            <p>{s.d}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

