import { useMemo, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from '../lib/gsap';

const STEPS = [
  { t: 'Dessin', d: 'Chaque objet est d’abord modélisé en 3D : proportions, épaisseurs, points d’appui.' },
  { t: 'Préparation', d: 'Le modèle est découpé en fines couches horizontales qui deviennent les trajectoires de l’imprimante.' },
  { t: 'Impression', d: 'La buse dépose le filament fondu, couche après couche, jusqu’à construire la forme complète.' },
  { t: 'Finition', d: 'La pièce est détachée du plateau, nettoyée et vérifiée avant expédition.' },
];
const LAYERS = 46;

/**
 * Fabrication, pilotée par le défilement : la section est épinglée et une seule
 * timeline « scrubbée » raconte les 4 étapes, avec aimantation sur chaque étape.
 *   Dessin      : le contour de l'objet se trace
 *   Préparation : les couches apparaissent en filigrane (le tranchage)
 *   Impression  : les couches se remplissent du bas vers le haut, la buse suit la couche en cours
 *   Finition    : le contour s'efface, la pièce reste
 */
export function Process({ standalone = false }: { standalone?: boolean }) {
  const root = useRef<HTMLElement>(null);
  const [step, setStep] = useState(0);

  // profil d'une lampe (abat-jour + tige + pied), en couches ; y en % du cadre, 0 = bas
  const rows = useMemo(
    () =>
      Array.from({ length: LAYERS }, (_, i) => {
        const t = i / (LAYERS - 1);
        const w = t < 0.06 ? 0.42 : t < 0.5 ? 0.035 : 0.86 - ((t - 0.5) / 0.5) * 0.5;
        return { y: 94 - t * 86, w };
      }),
    [],
  );
  const outline = useMemo(() => {
    const right = rows.map((r) => `${50 + r.w * 50},${r.y}`);
    const left = [...rows].reverse().map((r) => `${50 - r.w * 50},${r.y}`);
    return [...right, ...left].join(' ');
  }, [rows]);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(
        { desktop: '(min-width: 900px)', motion: '(prefers-reduced-motion: no-preference)' },
        (ctx) => {
          const { desktop, motion } = ctx.conditions as { desktop: boolean; motion: boolean };
          if (!motion) { setStep(3); return; }
          const fig = root.current!.querySelector<HTMLElement>('.process__figure')!;
          const path = root.current!.querySelector<SVGPolygonElement>('.process__outline')!;
          const len = path.getTotalLength();
          const tl = gsap.timeline({
            defaults: { ease: 'none' },
            scrollTrigger: {
              trigger: root.current,
              start: desktop ? 'top top' : 'top 10%',
              end: desktop ? '+=260%' : '+=200%',
              pin: true,
              scrub: 0.6,
              snap: { snapTo: 'labelsDirectional', duration: { min: 0.2, max: 0.6 }, delay: 0.15, ease: 'power1.inOut' },
              onUpdate: (self) => setStep(Math.min(3, Math.floor(self.progress * 3.999))),
            },
          });
          tl.addLabel('dessin')
            .fromTo(path, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 1 })
            .addLabel('preparation')
            .fromTo('.process__slice', { autoAlpha: 0, scaleX: 0.6 }, { autoAlpha: 0.35, scaleX: 1, stagger: { each: 0.02, from: 'start' }, duration: 0.5 })
            .addLabel('impression')
            // remplissage et buse pilotés par la même progression : la buse est toujours sur la couche en cours
            .fromTo('.process__layers', { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: 1.4 }, 'impression')
            .fromTo('.process__nozzle', { y: 0 }, { y: () => -fig.clientHeight * 0.86, duration: 1.4 }, 'impression')
            .addLabel('finition')
            .to(path, { autoAlpha: 0, duration: 0.5 })
            .to('.process__nozzle', { autoAlpha: 0, duration: 0.3 }, '<')
            .to('.process__layers', { scale: 1.04, transformOrigin: '50% 100%', duration: 0.5 }, '<')
            .addLabel('fin');
        },
      );
    },
    { scope: root },
  );

  return (
    <section className={`process ${standalone ? 'process--page' : ''}`} ref={root} aria-labelledby="process-title">
      <header className="section-head">
        <h2 id="process-title" data-reveal>Comment un objet est imprimé</h2>
      </header>
      <figure className="process__figure" aria-hidden="true">
        <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" className="process__svg">
          <polygon className="process__outline" points={outline} />
          {rows.map((r, i) => (
            <line key={`s${i}`} className="process__slice" x1={50 - r.w * 50} x2={50 + r.w * 50} y1={r.y} y2={r.y} />
          ))}
        </svg>
        <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" className="process__svg process__layers">
          {rows.map((r, i) => (
            <line key={`l${i}`} x1={50 - r.w * 50} x2={50 + r.w * 50} y1={r.y} y2={r.y} />
          ))}
        </svg>
        <span className="process__nozzle" />
        <span className="process__bed" />
      </figure>
      <ol className="process__steps">
        {STEPS.map((s, i) => (
          <li key={s.t} className={i === step ? 'is-active' : i < step ? 'is-done' : ''} aria-current={i === step ? 'step' : undefined}>
            <h3>{s.t}</h3>
            <p>{s.d}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
