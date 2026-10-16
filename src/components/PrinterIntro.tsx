import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '../lib/motion';

/**
 * Introduction : une imprimante 3D imprime le logo couche par couche.
 *
 * Synchronisation : le logo est découpé en couches horizontales, chaque couche en
 * segments d'extrusion (là où la lettre existe). La buse suit ce trajet en serpentin
 * et la matière n'est déposée QUE sous la position courante de la buse : le dépôt
 * visible et le déplacement de la tête sont calculés à partir de la même variable.
 */

interface Seg {
  x0: number;
  x1: number;
  y: number; // centre de la couche (repère logo)
  extrude: boolean;
  t0: number; // instant de début (s)
  t1: number;
}

const PRINT_TIME = 3.4; // durée d'impression
const PARK_TIME = 0.7; // dégagement de la tête après impression

interface Props {
  text: string;
  onDone?: () => void;
  skip?: boolean;
}

export function PrinterIntro({ text, onDone, skip }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const [done, setDone] = useState(false);
  const skipRef = useRef(false);
  skipRef.current = !!skip;

  useEffect(() => {
    const cv = ref.current!;
    const ctx = cv.getContext('2d')!;
    let raf = 0;
    let disposed = false;
    let start = 0;
    let finished = false;

    // ---------- géométrie (recalculée au redimensionnement) ----------
    let W = 0, H = 0, dpr = 1;
    let frame = { x: 0, y: 0, w: 0, h: 0 }; // cadre de l'imprimante
    let bedY = 0;
    let logo = { x: 0, y: 0, w: 0, h: 0, layer: 4 };
    let segs: Seg[] = [];
    let printed: HTMLCanvasElement; // matière déposée
    let pctx: CanvasRenderingContext2D;
    let drawnTo = 0; // temps jusqu'auquel la matière a été déposée

    const layout = () => {
      dpr = Math.min(devicePixelRatio || 1, 2);
      W = cv.clientWidth;
      H = cv.clientHeight;
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      const fw = Math.min(W * 0.92, H * 1.3, 1180);
      const fh = Math.min(H * 0.9, fw * 0.8);
      frame = { x: (W - fw) / 2, y: (H - fh) / 2 + H * 0.04, w: fw, h: fh };
      bedY = frame.y + fh * 0.86;
      // logo rastérisé sur un canvas hors écran
      const lw = fw * 0.62;
      const off = document.createElement('canvas');
      const octx = off.getContext('2d')!;
      let size = 200;
      octx.font = `700 ${size}px Archivo, 'Arial Black', sans-serif`;
      const ratio = lw / octx.measureText(text).width;
      size = Math.floor(size * ratio);
      const lh = Math.round(size * 0.74);
      off.width = Math.ceil(lw) + 4;
      off.height = lh + 4;
      octx.font = `700 ${size}px Archivo, 'Arial Black', sans-serif`;
      octx.textBaseline = 'alphabetic';
      octx.fillStyle = '#fff';
      octx.fillText(text, 2, lh + 2);
      logo = { x: frame.x + (fw - lw) / 2, y: bedY - lh - 2, w: lw, h: lh, layer: Math.max(3, Math.round(lh / 34)) };

      // ---------- trajet : couches du bas vers le haut, serpentin ----------
      const img = octx.getImageData(0, 0, off.width, off.height).data;
      const raw: Omit<Seg, 't0' | 't1'>[] = [];
      let dir = 1;
      let headX = 0;
      for (let y = off.height - 2 - logo.layer / 2; y > 0; y -= logo.layer) {
        const row = Math.round(y);
        const spans: [number, number][] = [];
        let s = -1;
        for (let x = 0; x < off.width; x++) {
          const on = img[(row * off.width + x) * 4 + 3] > 110;
          if (on && s < 0) s = x;
          if (!on && s >= 0) { spans.push([s, x]); s = -1; }
        }
        if (s >= 0) spans.push([s, off.width]);
        if (!spans.length) continue;
        const ordered = dir > 0 ? spans : spans.map(([a, b]) => [b, a] as [number, number]).reverse();
        for (const [a, b] of ordered) {
          raw.push({ x0: headX, x1: a, y: row, extrude: false });
          raw.push({ x0: a, x1: b, y: row, extrude: true });
          headX = b;
        }
        dir = -dir;
      }
      // durées : extrusion à vitesse constante, déplacements à vide 4x plus rapides
      const cost = (r: (typeof raw)[number]) => Math.abs(r.x1 - r.x0) / (r.extrude ? 1 : 4) + (r.extrude ? 0 : 2);
      const total = raw.reduce((a, r) => a + cost(r), 0);
      let t = 0;
      segs = raw.map((r) => {
        const d = (cost(r) / total) * PRINT_TIME;
        const seg = { ...r, t0: t, t1: t + d };
        t += d;
        return seg;
      });

      printed = document.createElement('canvas');
      printed.width = cv.width;
      printed.height = cv.height;
      pctx = printed.getContext('2d')!;
      pctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const done = drawnTo;
      drawnTo = 0;
      deposit(done);
    };

    const toScreen = (x: number, y: number) => [logo.x + (x / (logo.w + 4)) * logo.w, logo.y + y] as const;

    // dépose la matière entre drawnTo et t (cordon : dégradé clair en haut, sombre en bas)
    const deposit = (t: number) => {
      const h = logo.layer;
      for (const s of segs) {
        if (!s.extrude || s.t1 <= drawnTo || s.t0 >= t) continue;
        const a = Math.max(0, (drawnTo - s.t0) / (s.t1 - s.t0));
        const b = Math.min(1, (t - s.t0) / (s.t1 - s.t0));
        const xa = s.x0 + (s.x1 - s.x0) * a;
        const xb = s.x0 + (s.x1 - s.x0) * b;
        const [sx0, sy] = toScreen(Math.min(xa, xb), s.y);
        const [sx1] = toScreen(Math.max(xa, xb), s.y);
        const g = pctx.createLinearGradient(0, sy - h / 2, 0, sy + h / 2);
        g.addColorStop(0, '#f3f5ff');
        g.addColorStop(0.45, '#cfd6f2');
        g.addColorStop(1, '#6f7aa3');
        pctx.fillStyle = g;
        pctx.fillRect(sx0, sy - h / 2, sx1 - sx0 + 0.6, h * 0.94);
      }
      drawnTo = Math.max(drawnTo, t);
    };

    // position de la buse à l'instant t : même source que le dépôt
    const nozzleAt = (t: number) => {
      if (!segs.length) return { x: logo.x, y: logo.y };
      if (t >= PRINT_TIME) {
        const last = segs[segs.length - 1];
        const [lx, ly] = toScreen(last.x1, last.y);
        const k = Math.min(1, (t - PRINT_TIME) / PARK_TIME);
        const e = 1 - Math.pow(1 - k, 3);
        return { x: lx + (frame.x + frame.w * 0.9 - lx) * e, y: ly - logo.layer / 2 - e * frame.h * 0.18 };
      }
      let lo = 0, hi = segs.length - 1;
      while (lo < hi) { const m = (lo + hi) >> 1; if (segs[m].t1 < t) lo = m + 1; else hi = m; }
      const s = segs[lo];
      const k = (t - s.t0) / (s.t1 - s.t0 || 1);
      const [x, y] = toScreen(s.x0 + (s.x1 - s.x0) * Math.min(1, Math.max(0, k)), s.y);
      return { x, y: y - logo.layer / 2 };
    };

    // ---------- dessin de l'imprimante ----------
    const metal = (x: number, y: number, w: number, h: number, vertical: boolean) => {
      const g = vertical ? ctx.createLinearGradient(x, 0, x + w, 0) : ctx.createLinearGradient(0, y, 0, y + h);
      g.addColorStop(0, '#1a2238');
      g.addColorStop(0.35, '#3a4562');
      g.addColorStop(0.5, '#56628a');
      g.addColorStop(1, '#141a2c');
      ctx.fillStyle = g;
      ctx.fillRect(x, y, w, h);
    };

    const draw = (t: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const { x, y, w, h } = frame;
      const post = Math.max(10, w * 0.022);
      const fade = t > PRINT_TIME + PARK_TIME ? Math.min(1, (t - PRINT_TIME - PARK_TIME) / 0.8) : 0;
      ctx.globalAlpha = 1 - fade * 0.55;

      // montants et traverse haute
      metal(x, y, post, h, true);
      metal(x + w - post, y, post, h, true);
      metal(x - post * 0.4, y - post, w + post * 0.8, post * 1.1, false);
      // tiges filetées (axe Z)
      ctx.fillStyle = '#7f89ab';
      for (const px of [x + post * 1.6, x + w - post * 2.2]) ctx.fillRect(px, y + post * 0.3, 2, h - post);

      // bobine de filament posée sur la traverse
      const sr = Math.max(26, w * 0.05);
      const sx = x + w * 0.5, sy = y - post - sr * 0.9;
      const spool = ctx.createRadialGradient(sx - sr * 0.3, sy - sr * 0.3, sr * 0.1, sx, sy, sr);
      spool.addColorStop(0, '#dfe5fb');
      spool.addColorStop(0.55, '#9aa6cf');
      spool.addColorStop(1, '#3a4467');
      ctx.fillStyle = spool;
      ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#141a2c';
      ctx.beginPath(); ctx.arc(sx, sy, sr * 0.32, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 1;
      for (let r = sr * 0.45; r < sr; r += 3) { ctx.beginPath(); ctx.arc(sx, sy, r, -2.4, -0.9); ctx.stroke(); }
      metal(sx - post * 0.6, sy, post * 1.2, y - post - sy, true);

      // plateau en légère perspective
      const bedW = w * 0.82;
      const bx = x + (w - bedW) / 2;
      ctx.fillStyle = '#0d1426';
      ctx.beginPath();
      ctx.moveTo(bx + bedW * 0.06, bedY - h * 0.05);
      ctx.lineTo(bx + bedW * 0.94, bedY - h * 0.05);
      ctx.lineTo(bx + bedW, bedY);
      ctx.lineTo(bx, bedY);
      ctx.closePath();
      ctx.fill();
      const bed = ctx.createLinearGradient(0, bedY, 0, bedY + 10);
      bed.addColorStop(0, '#59648a');
      bed.addColorStop(1, '#161d33');
      ctx.fillStyle = bed;
      ctx.fillRect(bx, bedY, bedW, 10);
      ctx.globalAlpha = 1;

      // matière déposée
      deposit(Math.min(t, PRINT_TIME));
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(printed, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalAlpha = 1 - fade * 0.55;

      // portique X (monte avec la couche) + chariot + buse
      const n = nozzleAt(t);
      const carH = Math.max(34, h * 0.09);
      const gy = n.y - carH - 6;
      metal(x + post * 0.5, gy, w - post, Math.max(8, post * 0.7), false);
      // chariots de l'axe Z qui portent le portique
      for (const cx of [x - post * 0.3, x + w - post * 1.7]) metal(cx, gy - post * 0.8, post * 2, post * 2.6, true);
      const cw = Math.max(46, w * 0.07);
      const cg = ctx.createLinearGradient(n.x - cw / 2, 0, n.x + cw / 2, 0);
      cg.addColorStop(0, '#20283f');
      cg.addColorStop(0.4, '#4a5679');
      cg.addColorStop(1, '#1a2034');
      ctx.fillStyle = cg;
      ctx.fillRect(n.x - cw / 2, gy - carH * 0.25, cw, carH);
      // bloc de chauffe et buse
      ctx.fillStyle = '#9aa3bf';
      ctx.fillRect(n.x - 7, n.y - 14, 14, 8);
      ctx.fillStyle = '#c8b27a';
      ctx.beginPath();
      ctx.moveTo(n.x - 5, n.y - 6);
      ctx.lineTo(n.x + 5, n.y - 6);
      ctx.lineTo(n.x + 1.4, n.y);
      ctx.lineTo(n.x - 1.4, n.y);
      ctx.closePath();
      ctx.fill();
      // pointe chaude de la buse pendant l'extrusion
      if (t < PRINT_TIME) {
        const hot = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, 9);
        hot.addColorStop(0, 'rgba(255, 190, 120, 0.9)');
        hot.addColorStop(1, 'rgba(255, 190, 120, 0)');
        ctx.fillStyle = hot;
        ctx.beginPath(); ctx.arc(n.x, n.y, 9, 0, Math.PI * 2); ctx.fill();
      }
      // filament entrant
      ctx.strokeStyle = 'rgba(207, 214, 242, 0.55)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(n.x, gy - carH * 0.25);
      ctx.bezierCurveTo(n.x, y - post * 2, sx, y - post * 2, sx, sy + sr * 0.3);
      ctx.stroke();
      ctx.globalAlpha = 1;
    };

    const tick = (now: number) => {
      if (disposed) return;
      if (!start) start = now;
      let t = (now - start) / 1000;
      if (skipRef.current) t = PRINT_TIME + PARK_TIME + 1;
      draw(t);
      if (t < PRINT_TIME + PARK_TIME + 0.8) raf = requestAnimationFrame(tick);
      else if (!finished) { finished = true; setDone(true); onDone?.(); }
    };

    const begin = () => {
      if (disposed) return;
      layout();
      if (reduced) { draw(PRINT_TIME + PARK_TIME + 1); finished = true; setDone(true); onDone?.(); return; }
      raf = requestAnimationFrame(tick);
    };
    // la police doit être chargée avant de découper le logo (délai maximal court)
    Promise.race([document.fonts.load(`700 100px Archivo`), new Promise((r) => setTimeout(r, 900))]).then(begin);

    const ro = new ResizeObserver(() => {
      if (!segs.length) return;
      const end = finished ? PRINT_TIME + PARK_TIME + 1 : drawnTo;
      layout();
      if (finished) draw(end);
    });
    ro.observe(cv);
    return () => { disposed = true; cancelAnimationFrame(raf); ro.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, reduced]);

  return <canvas ref={ref} className={`printer ${done ? 'is-done' : ''}`} role="img" aria-label={`Une imprimante 3D imprime le logo ${text}`} />;
}
