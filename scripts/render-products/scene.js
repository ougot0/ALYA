// Studio de rendu des visuels provisoires : objets modélisés en 3D (pas des photos).
// Exécuté dans Chromium par render.mjs ; expose window.renderProduct(spec) -> { color, depth } en PNG data URL.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const W = 1000, H = 1250;
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setSize(W, H);
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
const env = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;

// Lignes de couche : relief horizontal fin, comme sur une vraie pièce imprimée
function layerBump(lines) {
  const c = document.createElement('canvas');
  c.width = 8; c.height = 512;
  const g = c.getContext('2d');
  for (let y = 0; y < 512; y++) {
    const v = 0.5 + 0.5 * Math.sin((y / 512) * lines * Math.PI * 2);
    const k = Math.round(90 + v * 140);
    g.fillStyle = `rgb(${k},${k},${k})`;
    g.fillRect(0, y, 8, 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function pla(color, opts = {}) {
  return new THREE.MeshPhysicalMaterial({
    color, roughness: 0.48, metalness: 0, clearcoat: 0.15, clearcoatRoughness: 0.6,
    sheen: 0.3, sheenRoughness: 0.5, bumpMap: layerBump(opts.lines ?? 140), bumpScale: opts.bump ?? 1.2,
    envMapIntensity: 0.55, ...opts.extra,
  });
}

// Plan-projection : UV v = hauteur monde, pour que les couches restent horizontales sur toute pièce
function worldYUV(geo, scale = 1) {
  const p = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + p.getZ(i)) * scale, p.getY(i) * scale);
  uv.needsUpdate = true;
  return geo;
}

function lamp(color, lightColor) {
  const g = new THREE.Group();
  // abat-jour : profil légèrement galbé, paroi fine
  const prof = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    prof.push(new THREE.Vector2(0.5 - 0.24 * t + 0.03 * Math.sin(t * Math.PI), t * 0.62));
  }
  const shadeGeo = new THREE.LatheGeometry(prof, 160);
  const shadeMat = pla(color, {
    lines: 170, bump: 1.6,
    extra: { side: THREE.DoubleSide, transmission: 0.12, thickness: 0.02, emissive: new THREE.Color(lightColor), emissiveIntensity: 0.32, roughness: 0.6 },
  });
  // lumière plus forte vers le bas de l'abat-jour (proche de l'ampoule)
  const em = document.createElement('canvas'); em.width = 4; em.height = 256;
  const eg = em.getContext('2d'); const grd = eg.createLinearGradient(0, 0, 0, 256);
  grd.addColorStop(0, '#ffffff'); grd.addColorStop(0.55, '#8a8a8a'); grd.addColorStop(1, '#3a3a3a');
  eg.fillStyle = grd; eg.fillRect(0, 0, 4, 256);
  shadeMat.emissiveMap = new THREE.CanvasTexture(em);
  const shade = new THREE.Mesh(shadeGeo, shadeMat);
  shade.position.y = 0.78;
  g.add(shade);
  // ampoule et lumière interne
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 32, 16), new THREE.MeshBasicMaterial({ color: 0xfff4e0 }));
  bulb.position.y = 0.95;
  g.add(bulb);
  const inner = new THREE.PointLight(lightColor, 3.5, 2.5, 1.6);
  inner.position.y = 0.95;
  g.add(inner);
  // tige et pied (métal sombre + pied imprimé)
  const metal = new THREE.MeshStandardMaterial({ color: 0x2a2d35, metalness: 0.9, roughness: 0.32, envMapIntensity: 1 });
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.86, 32), metal);
  stem.position.y = 0.45;
  stem.castShadow = true;
  g.add(stem);
  const baseProf = [new THREE.Vector2(0, 0), new THREE.Vector2(0.2, 0), new THREE.Vector2(0.215, 0.012), new THREE.Vector2(0.215, 0.03), new THREE.Vector2(0.2, 0.045), new THREE.Vector2(0.05, 0.05), new THREE.Vector2(0, 0.05)];
  const base = new THREE.Mesh(new THREE.LatheGeometry(baseProf, 96), pla(0x22252c, { lines: 8, bump: 0.6 }));
  base.castShadow = true;
  g.add(base);
  shade.castShadow = true;
  return g;
}

function support(color) {
  const g = new THREE.Group();
  const m = pla(color, { lines: 60, bump: 1.4 });
  const add = (geo, x, y, z, rx = 0) => {
    worldYUV(geo, 2.2);
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x, y, z); mesh.rotation.x = rx;
    mesh.castShadow = mesh.receiveShadow = true;
    g.add(mesh);
    return mesh;
  };
  // socle
  add(new RoundedBoxGeometry(1.1, 0.12, 0.5, 6, 0.03), 0, 0.06, 0);
  // dossier incliné pour le téléphone
  add(new RoundedBoxGeometry(0.42, 0.78, 0.07, 6, 0.03), -0.2, 0.47, -0.08, -0.26);
  // lèvre de maintien
  add(new RoundedBoxGeometry(0.46, 0.08, 0.08, 6, 0.025), -0.2, 0.16, 0.12);
  // bras pour casque : tube vertical + crochet
  const path = new THREE.CurvePath();
  path.add(new THREE.LineCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.82, 0)));
  path.add(new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0.82, 0), new THREE.Vector3(0, 0.95, 0), new THREE.Vector3(0.12, 0.95, 0)));
  path.add(new THREE.LineCurve3(new THREE.Vector3(0.12, 0.95, 0), new THREE.Vector3(0.12, 0.88, 0)));
  add(new THREE.TubeGeometry(path, 120, 0.035, 24, false), 0.36, 0.1, -0.08);
  // encoches à câbles et vide-poche : creux sombres dans le socle
  const dark = new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.25), roughness: 0.8 });
  for (const x of [-0.46, -0.4, -0.34]) {
    const n = new THREE.Mesh(new RoundedBoxGeometry(0.026, 0.02, 0.16, 4, 0.012), dark);
    n.position.set(x, 0.115, 0.12); g.add(n);
  }
  const pocket = new THREE.Mesh(new RoundedBoxGeometry(0.3, 0.02, 0.2, 4, 0.02), dark);
  pocket.position.set(0.2, 0.115, 0.1); g.add(pocket);
  return g;
}

function scene(spec) {
  const s = new THREE.Scene();
  s.environment = env;
  const obj = spec.kind === 'lamp' ? lamp(spec.color, spec.light) : support(spec.color);
  s.add(obj);
  // lumière principale (haut gauche), contre-jour violet discret (installation hors champ à droite)
  const key = new THREE.DirectionalLight(0xffffff, spec.kind === 'lamp' ? 1.0 : 1.5);
  key.position.set(-1.2, 5, 1.8);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.radius = 6;
  key.shadow.camera.left = key.shadow.camera.bottom = -2;
  key.shadow.camera.right = key.shadow.camera.top = 2;
  s.add(key);
  const rim = new THREE.DirectionalLight(0x7a5cff, 1.4);
  rim.position.set(3, 1.5, -2.5);
  s.add(rim);
  // sol invisible qui ne garde que l'ombre de contact
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.ShadowMaterial({ opacity: 0.55 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  s.add(floor);
  obj.rotation.y = spec.yaw ?? -0.35;
  return { s, obj, floor };
}

const depthMat = new THREE.ShaderMaterial({
  uniforms: { uNear: { value: 1 }, uFar: { value: 3 } },
  vertexShader: 'varying float vZ; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vZ = -mv.z; gl_Position = projectionMatrix * mv; }',
  fragmentShader: 'uniform float uNear; uniform float uFar; varying float vZ; void main(){ float d = 1.0 - clamp((vZ-uNear)/(uFar-uNear),0.0,1.0); gl_FragColor = vec4(vec3(d),1.0); }',
  side: THREE.DoubleSide,
});

window.renderProduct = (spec) => {
  const { s, obj, floor } = scene(spec);
  const box = new THREE.Box3().setFromObject(obj);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const cam = new THREE.PerspectiveCamera(26, W / H, 0.1, 50);
  const dist = (Math.max(size.y, size.x * H / W) * 1.18) / (2 * Math.tan((cam.fov * Math.PI) / 360));
  const elev = spec.elevation ?? 0.16;
  cam.position.set(center.x, center.y + Math.sin(elev) * dist, center.z + Math.cos(elev) * dist);
  cam.lookAt(center);
  renderer.render(s, cam);
  const color = renderer.domElement.toDataURL('image/png');
  // profondeur exacte du rendu (blanc = proche)
  const r = size.length() / 2;
  const cd = cam.position.distanceTo(center);
  depthMat.uniforms.uNear.value = cd - r * 0.55;
  depthMat.uniforms.uFar.value = cd + r * 0.55;
  floor.visible = false;
  s.overrideMaterial = depthMat;
  s.environment = null;
  renderer.setClearColor(0x000000, 1);
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.render(s, cam);
  const depth = renderer.domElement.toDataURL('image/png');
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  return { color, depth };
};
window.ready = true;
