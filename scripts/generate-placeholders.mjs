/**
 * Génère des VISUELS PROVISOIRES (illustrations vectorielles, pas des photos)
 * pour la lampe et le support, avec leur carte de profondeur.
 * À remplacer par les vraies photographies via `npm run assets:depth`.
 */
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const W = 1000, H = 1250;
const out = 'public/products';
await mkdir(out, { recursive: true });

const ribs = (x0, y0, x1, y1, step, color, op) => {
  let s = '';
  for (let y = y0; y < y1; y += step) s += `<line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}" stroke="${color}" stroke-opacity="${op}" stroke-width="2"/>`;
  return s;
};

const shade = 'M372 232 C440 214 560 214 628 232 C700 380 770 560 820 700 C640 742 360 742 180 700 C230 560 300 380 372 232 Z';

function lamp({ lit, depth }) {
  const fillShade = depth ? 'url(#dg)' : 'url(#sg)';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="sg" x1="0" x2="1">
      <stop offset="0" stop-color="${lit ? '#c98a4e' : '#a9714a'}"/>
      <stop offset=".45" stop-color="${lit ? '#f6d9a8' : '#e7c9a6'}"/>
      <stop offset=".6" stop-color="${lit ? '#efc68e' : '#dcb892'}"/>
      <stop offset="1" stop-color="${lit ? '#9c5f33' : '#7e5134'}"/>
    </linearGradient>
    <linearGradient id="dg" x1="0" x2="1">
      <stop offset="0" stop-color="#5a5a5a"/><stop offset=".5" stop-color="#ffffff"/><stop offset="1" stop-color="#5a5a5a"/>
    </linearGradient>
    <linearGradient id="stem" x1="0" x2="1">
      <stop offset="0" stop-color="${depth ? '#8a8a8a' : '#2c2a27'}"/><stop offset=".5" stop-color="${depth ? '#b5b5b5' : '#5d5852'}"/><stop offset="1" stop-color="${depth ? '#8a8a8a' : '#24221f'}"/>
    </linearGradient>
    <linearGradient id="base" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="${depth ? '#9a9a9a' : '#4a4540'}"/><stop offset="1" stop-color="${depth ? '#e0e0e0' : '#1f1d1b'}"/>
    </linearGradient>
    <radialGradient id="glow" cx=".5" cy="0" r="1">
      <stop offset="0" stop-color="#fff2d6" stop-opacity=".9"/><stop offset="1" stop-color="#fff2d6" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="sc"><path d="${shade}"/></clipPath>
  </defs>
  ${depth ? `<rect width="${W}" height="${H}" fill="#000"/>` : ''}
  <rect x="487" y="700" width="26" height="350" fill="url(#stem)"/>
  <path d="M330 1048 Q500 1030 670 1048 L680 1092 Q500 1112 320 1092 Z" fill="url(#base)"/>
  <path d="${shade}" fill="${fillShade}"/>
  ${depth ? '' : `<g clip-path="url(#sc)">${ribs(150, 236, 850, 745, 9, '#3a2416', 0.22)}${ribs(150, 240, 850, 745, 9, '#fff', 0.12)}</g>`}
  ${lit && !depth ? `<ellipse cx="500" cy="712" rx="300" ry="26" fill="url(#glow)"/>` : ''}
</svg>`;
}

const support = (depth) => {
  const c = (img, d) => (depth ? d : img);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="top" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${c('#8f8a82', '#9a9a9a')}"/><stop offset="1" stop-color="${c('#6e6a64', '#d0d0d0')}"/></linearGradient>
    <linearGradient id="front" x1="0" x2="1"><stop offset="0" stop-color="${c('#3b3935', '#e8e8e8')}"/><stop offset=".5" stop-color="${c('#55524c', '#ffffff')}"/><stop offset="1" stop-color="${c('#34322f', '#e8e8e8')}"/></linearGradient>
    <linearGradient id="back" x1="0" x2="1"><stop offset="0" stop-color="${c('#4a4742', '#3c3c3c')}"/><stop offset="1" stop-color="${c('#67635c', '#5a5a5a')}"/></linearGradient>
    <linearGradient id="arm" x1="0" x2="1"><stop offset="0" stop-color="${c('#3f3c38', '#5e5e5e')}"/><stop offset="1" stop-color="${c('#7a766f', '#7e7e7e')}"/></linearGradient>
  </defs>
  ${depth ? `<rect width="${W}" height="${H}" fill="#000"/>` : ''}
  <!-- bras pour casque -->
  <path d="M700 980 L700 300 Q700 250 750 250 L800 250 Q840 250 840 290 L840 320 L800 320 L800 300 L760 300 L760 980 Z" fill="url(#arm)"/>
  <!-- dossier téléphone incliné -->
  <path d="M260 940 L340 420 Q348 380 390 380 L560 380 Q600 380 594 420 L540 940 Z" fill="url(#back)"/>
  <!-- plateau -->
  <path d="M140 900 L860 900 L900 990 L100 990 Z" fill="url(#top)"/>
  <!-- encoches câbles -->
  ${[240, 300, 360].map((x) => `<rect x="${x}" y="918" width="22" height="50" rx="11" fill="${c('#22201e', '#7a7a7a')}"/>`).join('')}
  <!-- vide-poche -->
  <rect x="610" y="930" width="190" height="40" fill="${c('#2a2825', '#8c8c8c')}"/>
  <!-- face avant -->
  <path d="M100 990 L900 990 L900 1080 L100 1080 Z" fill="url(#front)"/>
  <!-- lèvre de maintien -->
  <path d="M250 880 L560 880 L560 930 L250 930 Z" fill="${c('#5a564f', '#f2f2f2')}"/>
  ${depth ? '' : ribs(100, 994, 900, 1080, 8, '#000', 0.18)}
</svg>`;
};

const jobs = [
  ['lampe-onde-1', lamp({ lit: false, depth: false }), lamp({ lit: false, depth: true })],
  ['lampe-onde-2', lamp({ lit: true, depth: false }), lamp({ lit: true, depth: true })],
  ['support-trame-1', support(false), support(true)],
];

for (const [name, img, depth] of jobs) {
  await sharp(Buffer.from(img)).webp({ quality: 88, alphaQuality: 100 }).toFile(`${out}/${name}.webp`);
  await sharp(Buffer.from(depth)).blur(6).grayscale().webp({ quality: 85 }).toFile(`${out}/${name}-depth.webp`);
  console.log('✓', name);
}
