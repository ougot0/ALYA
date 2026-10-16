/**
 * Pipeline « AutoDepth » de préparation d'une photo produit (exécuté AVANT la mise en ligne,
 * jamais dans le navigateur du client) :
 *   1. détourage (modèle RMBG via transformers.js)  -> masque alpha
 *   2. estimation de profondeur (Depth Anything V2) -> carte de profondeur
 *   3. optimisation : WebP redimensionné, profondeur masquée et adoucie sur les contours
 *
 * Usage :
 *   npm i -D @huggingface/transformers        (une seule fois, ~ dépendance lourde, dev uniquement)
 *   npm run assets:depth -- photo.jpg mon-produit-1
 *   -> public/products/mon-produit-1.webp et mon-produit-1-depth.webp
 *
 * Limites honnêtes : la carte est une ESTIMATION relative à partir d'une seule photo.
 * Elle donne du relief (2.5D), elle ne reconstruit pas les faces cachées de l'objet.
 * Les textes incrustés DANS la silhouette du produit ne sont pas supprimés automatiquement :
 * nettoyer la photo avant (retouche) si nécessaire.
 */
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const [input, slug] = process.argv.slice(2);
if (!input || !slug) {
  console.error('Usage : npm run assets:depth -- <photo> <slug>');
  process.exit(1);
}

let tf;
try {
  tf = await import('@huggingface/transformers');
} catch {
  console.error('Installez d’abord : npm i -D @huggingface/transformers');
  process.exit(1);
}
const { pipeline, RawImage } = tf;
const MAX = 1400;
const out = 'public/products';
await mkdir(out, { recursive: true });

const src = await sharp(input).rotate().resize(MAX, MAX, { fit: 'inside' }).png().toBuffer();
const { width, height } = await sharp(src).metadata();
const image = await RawImage.fromBlob(new Blob([src]));

console.log('1/3 détourage…');
const remover = await pipeline('background-removal', 'briaai/RMBG-1.4');
const [cut] = await remover(image);
const alpha = await sharp(Buffer.from(cut.data), { raw: { width: cut.width, height: cut.height, channels: cut.channels } })
  .extractChannel(cut.channels - 1).resize(width, height).toBuffer();

console.log('2/3 profondeur…');
const estimator = await pipeline('depth-estimation', 'onnx-community/depth-anything-v2-small');
const { depth } = await estimator(image);
const depthBuf = await sharp(Buffer.from(depth.data), { raw: { width: depth.width, height: depth.height, channels: 1 } })
  .resize(width, height).normalise().toBuffer();

console.log('3/3 optimisation…');
// Profondeur multipliée par le masque : le fond retombe à 0, les contours sont adoucis
// pour limiter l'étirement des sommets en bordure.
// érosion douce du masque : le relief retombe à zéro avant la silhouette (pas de crénelage au pivot)
const softMask = await sharp(alpha, { raw: { width, height, channels: 1 } }).blur(14).raw().toBuffer();
const d = await sharp(depthBuf).raw().toBuffer();
const masked = Buffer.alloc(d.length);
for (let i = 0; i < d.length; i++) {
  const t = Math.min(1, Math.max(0, (softMask[i] / 255 - 0.6) / 0.38));
  masked[i] = Math.round(d[i] * t * t * (3 - 2 * t));
}

const rgb = await sharp(src).removeAlpha().raw().toBuffer();
await sharp(rgb, { raw: { width, height, channels: 3 } })
  .joinChannel(alpha, { raw: { width, height, channels: 1 } })
  .webp({ quality: 86, alphaQuality: 100 }).toFile(`${out}/${slug}.webp`);
await sharp(masked, { raw: { width, height, channels: 1 } }).blur(2).resize(Math.round(width / 2))
  .webp({ quality: 85 }).toFile(`${out}/${slug}-depth.webp`);

console.log(`✓ ${out}/${slug}.webp + ${slug}-depth.webp`);
