import {
  DoubleSide,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  Vector2,
  Vector3,
  WebGLRenderer,
  LinearFilter,
  LinearMipmapLinearFilter,
} from 'three';

/**
 * Rendu 2.5D d'une photo produit : un plan subdivisé dont les sommets sont poussés
 * en Z selon la carte de profondeur. L'éclairage est calculé à partir du gradient
 * de la profondeur puis mélangé discrètement à la photo pour en préserver les détails.
 */

const vertex = /* glsl */ `
  uniform sampler2D uDepth;
  uniform sampler2D uMap;
  uniform vec2 uTexel;
  uniform float uIntensity;
  varying vec2 vUv;
  varying float vDepth;
  void main() {
    vUv = uv;
    // relief atténué près de la silhouette : évite d'étirer les contours
    vec2 o = uTexel * 16.0;
    float edge = min(min(texture2D(uMap, uv + vec2(o.x, 0.0)).a, texture2D(uMap, uv - vec2(o.x, 0.0)).a),
                     min(texture2D(uMap, uv + vec2(0.0, o.y)).a, texture2D(uMap, uv - vec2(0.0, o.y)).a));
    float d = texture2D(uDepth, uv).r * smoothstep(0.0, 1.0, edge);
    vDepth = d;
    vec3 p = position;
    // géométrie à peine déformée : la perspective globale vient du maillage,
    // le relief interne vient du décalage par pixel (fragment), qui garde des contours nets
    p.z += d * uIntensity * 0.3;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const fragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform sampler2D uDepth;
  uniform sampler2D uMask;
  uniform float uHasMask;
  uniform vec2 uTexel;
  uniform vec3 uLightDir;
  uniform float uLight;
  uniform float uAmbient;
  uniform float uOpacity;
  uniform vec3 uRimColor;
  uniform float uRim;
  uniform float uSpec;
  uniform vec2 uTilt;
  varying vec2 vUv;
  varying float vDepth;
  void main() {
    // décalage par pixel guidé par la profondeur (2 itérations) :
    // les parties proches glissent plus que les parties lointaines
    vec2 uv = vUv + uTilt * (texture2D(uDepth, vUv).r - 0.4);
    uv = vUv + uTilt * (texture2D(uDepth, uv).r - 0.4);
    vec4 c = texture2D(uMap, uv);
    float a = c.a;
    if (uHasMask > 0.5) a *= texture2D(uMask, uv).r;
    if (a < 0.01) discard;
    // normale estimée à partir du gradient de profondeur
    float dx = texture2D(uDepth, uv + vec2(uTexel.x, 0.0)).r - texture2D(uDepth, uv - vec2(uTexel.x, 0.0)).r;
    float dy = texture2D(uDepth, uv + vec2(0.0, uTexel.y)).r - texture2D(uDepth, uv - vec2(0.0, uTexel.y)).r;
    vec3 n = normalize(vec3(-dx * 6.0, -dy * 6.0, 1.0));
    float diff = max(dot(n, normalize(uLightDir)), 0.0);
    float shade = mix(1.0, uAmbient + diff * (1.0 - uAmbient) * 1.15, uLight);
    vec3 L = normalize(uLightDir);
    // reflet discret (Blinn-Phong, observateur face à l'écran)
    float spec = pow(max(dot(n, normalize(L + vec3(0.0, 0.0, 1.0))), 0.0), 48.0) * uSpec;
    // lumière d'ambiance hors champ : n'éclaire que les pentes tournées vers elle
    float rim = max(dot(normalize(n.xy + 1e-4), normalize(vec2(0.9, 0.5))), 0.0) * (1.0 - n.z) * uRim * 3.0;
    vec3 col = c.rgb * shade + vec3(spec) + uRimColor * rim;
    gl_FragColor = vec4(col, a * uOpacity);
    #include <colorspace_fragment>
  }
`;

export interface DepthSceneOptions {
  image: string;
  depthMap: string;
  mask?: string;
  intensity: number;
  segments: number;
  light: { direction: [number, number, number]; strength: number; ambient: number; rim?: [number, number, number]; rimStrength?: number; spec?: number };
}

export interface DepthMotion {
  /** -1..1 : décalage de perspective (souris, toucher ou défilement) */
  x: number;
  y: number;
  /** 0..1 : avancée vers le visiteur (effet de sortie d'écran) */
  push: number;
}

const loader = new TextureLoader();
const load = (url: string) =>
  new Promise<Texture>((res, rej) => loader.load(url, res, undefined, () => rej(new Error(`Texture introuvable : ${url}`))));

export class DepthScene {
  private renderer: WebGLRenderer;
  private scene = new Scene();
  private camera = new PerspectiveCamera(30, 1, 0.1, 20);
  private mesh?: Mesh<PlaneGeometry, ShaderMaterial>;
  private raf = 0;
  private current = new Vector3();
  private aspect = 1;
  private running = false;
  private visible = true;
  motion: DepthMotion = { x: 0, y: 0, push: 0 };
  parallax = 1;
  scale = 1;
  offset = new Vector2();
  float = 0;
  /** débordement du canvas, en fraction de la taille du cadre */
  bleed = 0;
  /** déplacement latéral pendant l'avancée (unités de scène) */
  drift = 0;

  constructor(private canvas: HTMLCanvasElement, private opts: DepthSceneOptions) {
    this.renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.camera.position.set(0, 0, 3.2);
  }

  async init() {
    const { image, depthMap, mask } = this.opts;
    const [map, depth, maskTex] = await Promise.all([load(image), load(depthMap), mask ? load(mask) : Promise.resolve(null)]);
    map.colorSpace = SRGBColorSpace;
    // photo et masque : mipmaps, sinon la silhouette crénèle quand l'image est réduite à l'écran
    for (const t of [map, maskTex]) if (t) { t.minFilter = LinearMipmapLinearFilter; t.generateMipmaps = true; t.anisotropy = 4; }
    depth.minFilter = LinearFilter;
    depth.generateMipmaps = false;
    const img = map.image as HTMLImageElement;
    this.aspect = img.width / img.height;
    const s = this.opts.segments;
    const geo = new PlaneGeometry(this.aspect, 1, Math.round(s * this.aspect), s);
    const dimg = depth.image as HTMLImageElement;
    const mat = new ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      transparent: true,
      side: DoubleSide,
      uniforms: {
        uMap: { value: map },
        uDepth: { value: depth },
        uMask: { value: maskTex },
        uHasMask: { value: maskTex ? 1 : 0 },
        uTexel: { value: new Vector2(1.5 / dimg.width, 1.5 / dimg.height) },
        uIntensity: { value: this.opts.intensity },
        uLightDir: { value: new Vector3(...this.opts.light.direction) },
        uLight: { value: this.opts.light.strength },
        uAmbient: { value: this.opts.light.ambient },
        uOpacity: { value: 1 },
        uRimColor: { value: new Vector3(...(this.opts.light.rim ?? [0.48, 0.36, 1])) },
        uRim: { value: this.opts.light.rimStrength ?? 0.35 },
        uSpec: { value: this.opts.light.spec ?? 0.12 },
        uTilt: { value: new Vector2() },
      },
    });
    this.mesh = new Mesh(geo, mat);
    this.scene.add(this.mesh);
    this.resize();
  }

  resize() {
    const { clientWidth: w, clientHeight: h } = this.canvas;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // cadrage identique à la photo (object-fit: contain) dans le cadre hors débordement
    const k = 1 + 2 * this.bleed;
    const w0 = w / k, h0 = h / k;
    const shown = Math.min(h0, w0 / this.aspect);
    this.camera.position.z = h / shown / 2 / Math.tan((this.camera.fov * Math.PI) / 360);
    this.camera.updateProjectionMatrix();
  }

  setVisible(v: boolean) {
    this.visible = v;
    if (v) this.start();
  }

  start() {
    if (this.running || !this.mesh) return;
    this.running = true;
    const tick = (t: number) => {
      if (!this.visible) { this.running = false; return; }
      this.raf = requestAnimationFrame(tick);
      this.frame(t / 1000);
    };
    this.raf = requestAnimationFrame(tick);
  }

  /** Une image fixe (préférence de réduction des animations). */
  renderStatic() {
    this.frame(0);
  }

  private frame(t: number) {
    const m = this.mesh;
    if (!m) return;
    const { x, y, push } = this.motion;
    // interpolation amortie : pas de mouvement brusque
    const target = new Vector3(x * this.parallax, y * this.parallax, push);
    this.current.lerp(target, 0.075);
    const c = this.current;
    m.rotation.y = c.x * 0.16 + c.z * -0.05;
    m.rotation.x = -c.y * 0.1 + c.z * 0.04;
    const k = this.scale * (1 + c.z * 0.12);
    m.scale.set(k, k, k * (1 + c.z * 0.4));
    m.position.set(this.offset.x + c.z * this.drift, this.offset.y + Math.sin(t * 0.8) * 0.012 * this.float, c.z * 0.3);
    const u = m.material.uniforms;
    // la lumière glisse avec l'avancée : l'objet se « tourne » vers le visiteur
    (u.uLightDir.value as Vector3).set(
      this.opts.light.direction[0] - c.x * 0.6 - c.z * 0.5,
      this.opts.light.direction[1] + c.y * 0.4,
      this.opts.light.direction[2],
    );
    u.uIntensity.value = this.opts.intensity * (1 + c.z * 0.45);
    // amplitude du décalage limitée : une photo ne montre pas les faces cachées
    (u.uTilt.value as Vector2).set(-c.x, c.y).multiplyScalar(this.opts.intensity * 0.05);
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.running = false;
    if (this.mesh) {
      const u = this.mesh.material.uniforms;
      (u.uMap.value as Texture)?.dispose();
      (u.uDepth.value as Texture)?.dispose();
      (u.uMask.value as Texture | null)?.dispose();
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
    }
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}
