import { useEffect, useRef, useState, type CSSProperties, type MutableRefObject } from 'react';
import type { DepthMotion } from '../three/DepthScene';
import { useReducedMotion, isCoarsePointer, hasWebGL } from '../lib/motion';

export interface DepthProductProps {
  image: string;
  depthMap?: string;
  mask?: string;
  alt: string;
  /** Intensité du relief (unités de scène, ~0.15 à 0.45) */
  depthIntensity?: number;
  /** Amplitude du parallaxe (0 = aucun) */
  parallax?: number;
  scale?: number;
  /** Décalage dans la scène, en fractions de hauteur */
  position?: [number, number];
  light?: { direction?: [number, number, number]; strength?: number; ambient?: number };
  animation?: {
    /** Flottement léger permanent (0 = aucun) */
    float?: number;
    /** Glissement latéral pendant l'avancée (push) */
    drift?: number;
    /** Source du mouvement de perspective */
    follow?: 'pointer' | 'drag' | 'none';
  };
  /** Contrôle externe (ex. GSAP ScrollTrigger) : x, y, push */
  motion?: MutableRefObject<DepthMotion>;
  /** Le canvas déborde du cadre de ce pourcentage, pour que l'objet puisse en sortir */
  bleed?: number;
  eager?: boolean;
  className?: string;
  style?: CSSProperties;
  imgStyle?: CSSProperties;
  onReady?: () => void;
}

/**
 * Présente n'importe quel produit avec l'effet de profondeur AutoDepth.
 * La photo d'origine est toujours rendue d'abord (et reste en place si WebGL,
 * la carte de profondeur ou les animations ne sont pas disponibles).
 */
export function DepthProduct({
  image,
  depthMap,
  mask,
  alt,
  depthIntensity = 0.3,
  parallax = 1,
  scale = 1,
  position = [0, 0],
  light,
  animation,
  motion,
  bleed = 0,
  eager = false,
  className,
  style,
  imgStyle,
  onReady,
}: DepthProductProps) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const [inView, setInView] = useState(eager);
  const reduced = useReducedMotion();
  const enabled = !!depthMap && typeof window !== 'undefined' && hasWebGL();

  // chargement différé : la scène n'est créée qu'à l'approche du viewport
  useEffect(() => {
    if (!enabled || eager) return;
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setInView(true), { rootMargin: '300px' });
    io.observe(el);
    return () => io.disconnect();
  }, [enabled, eager]);

  useEffect(() => {
    if (!enabled || !inView || !canvas.current || !depthMap) return;
    let disposed = false;
    let cleanup = () => {};
    const el = wrap.current!;
    const cv = canvas.current;
    const coarse = isCoarsePointer();

    import('../three/DepthScene').then(async ({ DepthScene }) => {
      if (disposed) return;
      const scene = new DepthScene(cv, {
        image,
        depthMap,
        mask,
        intensity: depthIntensity,
        segments: coarse ? 110 : 220,
        light: {
          direction: light?.direction ?? [-0.5, 0.6, 1],
          strength: light?.strength ?? 0.55,
          ambient: light?.ambient ?? 0.72,
        },
      });
      try {
        await scene.init();
      } catch {
        scene.dispose();
        return; // la photo reste affichée
      }
      if (disposed) return scene.dispose();
      scene.bleed = bleed / 100;
      scene.resize();
      scene.parallax = parallax * (coarse ? 0.6 : 1);
      scene.scale = scale;
      scene.offset.set(position[0], position[1]);
      scene.drift = animation?.drift ?? 0;
      scene.float = reduced ? 0 : animation?.float ?? 0;
      if (motion) scene.motion = motion.current;

      const follow = animation?.follow ?? 'pointer';
      const onMove = (e: PointerEvent) => {
        if (motion) return;
        const r = el.getBoundingClientRect();
        scene.motion.x = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
        scene.motion.y = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
      };
      const onLeave = () => { if (!motion) { scene.motion.x = 0; scene.motion.y = 0; } };
      // Sur tactile, seul le glissement horizontal oriente l'objet (le défilement vertical reste libre)
      let start: { x: number; y: number } | null = null;
      const onDown = (e: PointerEvent) => { start = { x: e.clientX, y: e.clientY }; };
      const onDrag = (e: PointerEvent) => {
        if (!start || motion) return;
        const r = el.getBoundingClientRect();
        scene.motion.x = Math.max(-1, Math.min(1, ((e.clientX - start.x) / r.width) * 3));
      };
      const onUp = () => { start = null; onLeave(); };

      const target = follow === 'pointer' && !coarse ? window : el;
      if (follow === 'pointer' && !coarse) window.addEventListener('pointermove', onMove, { passive: true });
      if (follow === 'pointer' && !coarse) el.addEventListener('pointerleave', onLeave);
      if (follow === 'drag' || (follow === 'pointer' && coarse)) {
        el.addEventListener('pointerdown', onDown);
        el.addEventListener('pointermove', coarse ? onDrag : onMove);
        el.addEventListener('pointerup', onUp);
        el.addEventListener('pointercancel', onUp);
        el.addEventListener('pointerleave', onUp);
      }

      const ro = new ResizeObserver(() => scene.resize());
      ro.observe(cv);
      // aucun rendu hors écran : économie GPU
      const io = new IntersectionObserver(([e]) => scene.setVisible(e.isIntersecting));
      io.observe(el);

      if (reduced) scene.renderStatic();
      else scene.start();
      setReady(true);
      onReady?.();

      cleanup = () => {
        target.removeEventListener('pointermove', onMove as EventListener);
        el.removeEventListener('pointermove', onMove);
        el.removeEventListener('pointermove', onDrag);
        el.removeEventListener('pointerleave', onLeave);
        el.removeEventListener('pointerleave', onUp);
        el.removeEventListener('pointerdown', onDown);
        el.removeEventListener('pointerup', onUp);
        el.removeEventListener('pointercancel', onUp);
        ro.disconnect();
        io.disconnect();
        scene.dispose();
      };
    });
    return () => {
      disposed = true;
      cleanup();
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, inView, image, depthMap, mask, reduced]);

  return (
    <div ref={wrap} className={`depth ${ready ? 'is-ready' : ''} ${className ?? ''}`} style={style}>
      <img className="depth__img" src={image} alt={alt} style={imgStyle} decoding="async" loading={eager ? 'eager' : 'lazy'} draggable={false} />
      {enabled && (
        <canvas
          ref={canvas}
          className="depth__canvas"
          aria-hidden="true"
          style={{ left: `${-bleed}%`, top: `${-bleed}%`, width: `${100 + 2 * bleed}%`, height: `${100 + 2 * bleed}%` }}
        />
      )}
    </div>
  );
}
