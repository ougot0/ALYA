/**
 * Rendus « studio » des visuels provisoires : objets modélisés en 3D (Three.js) et rendus
 * dans Chromium. Ce ne sont PAS des photographies : à remplacer par les vraies photos
 * (npm run assets:depth). La carte de profondeur est exacte (issue du rendu).
 *   npm run assets:render
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { chromium } from 'playwright-core';
import sharp from 'sharp';

const root = resolve('scripts/render-products');
const three = resolve('node_modules/three');
const types = { '.js': 'text/javascript', '.html': 'text/html' };
const server = createServer(async (req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const file = url.startsWith('/three/') ? join(three, url.slice(7)) : join(root, url === '/' ? 'index.html' : url);
  if (!file.startsWith(three) && !file.startsWith(root)) { res.writeHead(403).end(); return; }
  let body;
  try { body = await readFile(file); } catch { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' }).end(body);
}).listen(0);
const port = server.address().port;

const products = [
  { slug: 'lampe-onde', kind: 'lamp', variants: { ambre: ['#d98a3d', '#ffb35c'], corail: ['#d2533e', '#ff7a55'], glacier: ['#7fb7cc', '#d9f1ff'] } },
  { slug: 'support-trame', kind: 'support', variants: { graphite: ['#3b3f48'], opale: ['#d9dde3'], cobalt: ['#2450b8'] } },
];

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1000, height: 1250 } });
page.on('pageerror', (e) => console.error(e));
await page.goto(`http://localhost:${port}/`);
await page.waitForFunction(() => window.ready, null, { timeout: 30000 });

const png = (d) => Buffer.from(d.split(',')[1], 'base64');

/**
 * Profondeur qui retombe en douceur à zéro près de la silhouette :
 * sans cela, les triangles du maillage qui chevauchent le contour se déforment
 * et la silhouette crénèle quand l'objet pivote.
 */
async function edgeSafeDepth(colorPng, depthPng) {
  const { data: a, info } = await sharp(colorPng).extractChannel(3).blur(14).raw().toBuffer({ resolveWithObject: true });
  const { data: d } = await sharp(depthPng).grayscale().blur(4).raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(a.length);
  for (let i = 0; i < a.length; i++) {
    const t = Math.min(1, Math.max(0, (a[i] / 255 - 0.6) / 0.38)); // érosion douce du masque
    out[i] = Math.round(d[i] * t * t * (3 - 2 * t));
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 1 } });
}
for (const p of products) {
  let depthDone = false;
  for (const [name, [color, light]] of Object.entries(p.variants)) {
    const out = await page.evaluate((spec) => window.renderProduct(spec), { kind: p.kind, color, light });
    await sharp(png(out.color)).webp({ quality: 90, alphaQuality: 100 }).toFile(`public/products/${p.slug}-${name}.webp`);
    if (!depthDone) {
      await (await edgeSafeDepth(png(out.color), png(out.depth))).webp({ quality: 90 }).toFile(`public/products/${p.slug}-depth.webp`);
      depthDone = true;
    }
    console.log('✓', p.slug, name);
  }
}
await browser.close();
server.close();
