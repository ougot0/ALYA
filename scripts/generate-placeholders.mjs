/**
 * Génère des VISUELS PROVISOIRES (illustrations vectorielles, pas des photos)
 * pour chaque variante de couleur, avec une carte de profondeur par forme.
 * Ce sont des placeholders techniques : à remplacer par les vraies photographies
 * via `npm run assets:depth`.
 */
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const W = 1000, H = 1250;
const out = 'public/products';
await mkdir(out, { recursive: true });

// --- petites aides couleur ---
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const toHex = (c) => '#' + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => toHex(hex(a).map((v, i) => v + (hex(b)[i] - v) * t));
const shade = (c, t) => (t > 0 ? mix(c, '#ffffff', t) : mix(c, '#000000', -t));

const ribs = (x0, y0, x1, y1, step, color, op, w = 2) => {
  let s = '';
  for (let y = y0; y < y1; y += step) s += `<line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}" stroke="${color}" stroke-opacity="${op}" stroke-width="${w}"/>`;
  return s;
};

/* ------------------------------------------------------------- Lampe */
const shadePath = 'M372 232 C440 214 560 214 628 232 C700 380 770 560 820 700 C640 742 360 742 180 700 C230 560 300 380 372 232 Z';

function lamp(color, depth) {
  const c = color;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="sg" x1="0" x2="1">
      <stop offset="0" stop-color="${depth ? '#4a4a4a' : shade(c, -0.45)}"/>
      <stop offset=".3" stop-color="${depth ? '#d0d0d0' : shade(c, -0.05)}"/>
      <stop offset=".52" stop-color="${depth ? '#ffffff' : shade(c, 0.45)}"/>
      <stop offset=".72" stop-color="${depth ? '#d0d0d0' : shade(c, 0.05)}"/>
      <stop offset="1" stop-color="${depth ? '#4a4a4a' : shade(c, -0.55)}"/>
    </linearGradient>
    <radialGradient id="inner" cx=".5" cy=".78" r=".62">
      <stop offset="0" stop-color="#fff6e6" stop-opacity=".95"/>
      <stop offset=".35" stop-color="${shade(c, 0.55)}" stop-opacity=".55"/>
      <stop offset="1" stop-color="${c}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="stem" x1="0" x2="1">
      <stop offset="0" stop-color="${depth ? '#8a8a8a' : '#191c24'}"/><stop offset=".45" stop-color="${depth ? '#b8b8b8' : '#6d7280'}"/><stop offset="1" stop-color="${depth ? '#8a8a8a' : '#12141a'}"/>
    </linearGradient>
    <linearGradient id="base" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="${depth ? '#9a9a9a' : '#5a5f6b'}"/><stop offset=".25" stop-color="${depth ? '#c0c0c0' : '#2a2e37'}"/><stop offset="1" stop-color="${depth ? '#e6e6e6' : '#101217'}"/>
    </linearGradient>
    <radialGradient id="mouth" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="#fffaf0"/><stop offset=".6" stop-color="${shade(c, 0.6)}"/><stop offset="1" stop-color="${shade(c, 0.2)}"/>
    </radialGradient>
    <clipPath id="sc"><path d="${shadePath}"/></clipPath>
  </defs>
  ${depth ? `<rect width="${W}" height="${H}" fill="#000"/>` : ''}
  <rect x="487" y="700" width="26" height="350" fill="url(#stem)"/>
  ${depth ? '' : '<rect x="491" y="700" width="4" height="350" fill="#fff" opacity=".18"/>'}
  <path d="M330 1048 Q500 1030 670 1048 L680 1092 Q500 1112 320 1092 Z" fill="url(#base)"/>
  ${depth ? '' : '<path d="M330 1048 Q500 1030 670 1048 L672 1056 Q500 1040 328 1056 Z" fill="#fff" opacity=".22"/>'}
  <path d="${shadePath}" fill="url(#sg)"/>
  ${depth ? '' : `<g clip-path="url(#sc)">
    <rect x="150" y="200" width="700" height="560" fill="url(#inner)"/>
    ${ribs(150, 236, 850, 745, 9, '#000', 0.2)}${ribs(150, 240, 850, 745, 9, '#fff', 0.14)}
  </g>
  <ellipse cx="500" cy="712" rx="318" ry="22" fill="url(#mouth)"/>`}
</svg>`;
}

/* ----------------------------------------------------------- Support */
function support(color, depth) {
  const c = color;
  const d = (img, dep) => (depth ? dep : img);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="top" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${d(shade(c, 0.25), '#9a9a9a')}"/><stop offset="1" stop-color="${d(shade(c, 0.05), '#d0d0d0')}"/></linearGradient>
    <linearGradient id="front" x1="0" x2="1"><stop offset="0" stop-color="${d(shade(c, -0.45), '#e8e8e8')}"/><stop offset=".45" stop-color="${d(shade(c, -0.12), '#ffffff')}"/><stop offset="1" stop-color="${d(shade(c, -0.5), '#e8e8e8')}"/></linearGradient>
    <linearGradient id="back" x1="0" x2="1"><stop offset="0" stop-color="${d(shade(c, -0.35), '#3c3c3c')}"/><stop offset=".6" stop-color="${d(shade(c, 0.1), '#5a5a5a')}"/><stop offset="1" stop-color="${d(shade(c, -0.15), '#555')}"/></linearGradient>
    <linearGradient id="arm" x1="0" x2="1"><stop offset="0" stop-color="${d(shade(c, -0.4), '#5e5e5e')}"/><stop offset=".55" stop-color="${d(shade(c, 0.2), '#7e7e7e')}"/><stop offset="1" stop-color="${d(shade(c, -0.3), '#707070')}"/></linearGradient>
  </defs>
  ${depth ? `<rect width="${W}" height="${H}" fill="#000"/>` : ''}
  <path d="M700 980 L700 300 Q700 250 750 250 L800 250 Q840 250 840 290 L840 320 L800 320 L800 300 L760 300 L760 980 Z" fill="url(#arm)"/>
  <path d="M260 940 L340 420 Q348 380 390 380 L560 380 Q600 380 594 420 L540 940 Z" fill="url(#back)"/>
  ${depth ? '' : `<path d="M340 420 Q348 380 390 380 L560 380 Q600 380 594 420 L590 440 Q585 400 555 398 L392 398 Q356 400 350 440 Z" fill="#fff" opacity=".25"/>`}
  <path d="M140 900 L860 900 L900 990 L100 990 Z" fill="url(#top)"/>
  ${[240, 300, 360].map((x) => `<rect x="${x}" y="918" width="22" height="50" rx="11" fill="${d(shade(c, -0.7), '#7a7a7a')}"/>`).join('')}
  <rect x="610" y="930" width="190" height="40" fill="${d(shade(c, -0.6), '#8c8c8c')}"/>
  <path d="M100 990 L900 990 L900 1080 L100 1080 Z" fill="url(#front)"/>
  ${depth ? '' : '<path d="M100 990 L900 990 L900 996 L100 996 Z" fill="#fff" opacity=".35"/>'}
  <path d="M250 880 L560 880 L560 930 L250 930 Z" fill="${d(shade(c, 0.1), '#f2f2f2')}"/>
  ${depth ? '' : ribs(100, 1000, 900, 1080, 7, '#000', 0.22) + ribs(140, 905, 860, 990, 7, '#000', 0.08)}
</svg>`;
}

const variants = {
  'lampe-onde': { fn: lamp, colors: { ambre: '#e9a25a', corail: '#e5664f', glacier: '#8fcbe0' } },
  'support-trame': { fn: support, colors: { graphite: '#4a505e', opale: '#dfe3ea', cobalt: '#2f5fd0' } },
};

for (const [slug, { fn, colors }] of Object.entries(variants)) {
  await sharp(Buffer.from(fn('#888888', true))).blur(6).grayscale().webp({ quality: 85 }).toFile(`${out}/${slug}-depth.webp`);
  for (const [name, c] of Object.entries(colors)) {
    await sharp(Buffer.from(fn(c, false))).webp({ quality: 88, alphaQuality: 100 }).toFile(`${out}/${slug}-${name}.webp`);
    console.log('✓', slug, name);
  }
}
