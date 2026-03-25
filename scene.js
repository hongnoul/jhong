// ── Hash + PRNG ───────────────────────────────────────────────────────────────

function hash(col, row) {
  let h = (Math.imul(col, 2654435761) ^ Math.imul(row, 2246822519)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

function makeRand(seed) {
  return () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Geometry cache ────────────────────────────────────────────────────────────
// Constraints: p ≥ 2 (T(1,q) is unknotted), q > p (canonical form, T(p,q)≅T(q,p)).
// P_MAX / Q_MAX are tessellation constants: at TUBE_SEGS=256, higher winding
// numbers produce crossings too dense to resolve visually at cell size.

const TUBE_SEGS = 256;
const P_MIN = 2, P_MAX = 5;
const Q_MAX = 9;
const geoCache = new Map();

function getGeometry(p, q) {
  const key = `${p},${q}`;
  if (!geoCache.has(key)) {
    geoCache.set(key, new THREE.TorusKnotGeometry(2.5, 0.78, TUBE_SEGS, 32, p, q));
  }
  return geoCache.get(key);
}

// ── Scale constants ────────────────────────────────────────────────────────────
// Each maps a [0,1] draw to its physical range.

const AMB_INT_MAX    = 0.5;
const EM_INT_MAX     = 0.5;
const HEMI_INT_MAX   = 2.0;
const LIGHT_INT_MAX  = 5.0;
const LIGHT_POS_HALF = 15;
const ROT_SPEED_MAX  = 1.0;
const ROT_AMP_MAX    = 0.6;

// ── Config generator ──────────────────────────────────────────────────────────
// Every component is a raw uniform draw from [0, 1].
// All range mapping is deferred to apply time.

function generateConfig(col, row) {
  const rand = makeRand(hash(col, row));
  return {
    ambHue: rand(), ambSat: rand(), ambL: rand(), ambInt: rand(),
    objHue: rand(), objSat: rand(), objL:   rand(),
    roughness: rand(), metalness: rand(),
    emHue:  rand(), emSat:  rand(), emL:  rand(), emInt: rand(),
    clearcoat: rand(), ccRough: rand(),
    geoP: rand(), geoQ: rand(),
    lightType: rand(),
    skyHue: rand(), skySat: rand(), skyL: rand(),
    gndHue: rand(), gndSat: rand(), gndL: rand(),
    hemiInt: rand(),
    nLights: rand(),
    l: Array.from({ length: MAX_LIGHTS }, () => ({
      hue: rand(), sat: rand(), l: rand(), int: rand(),
      px: rand(), py: rand(), pz: rand(),
    })),
    rotY: rand(), rotSign: rand(),
    rotX: rand(), rotAmp: rand(),
    rotPhase: rand(),
  };
}

// ── Renderer ──────────────────────────────────────────────────────────────────

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setScissorTest(true);
const dpr = renderer.getPixelRatio();

function resizeRenderer() { renderer.setSize(window.innerWidth, window.innerHeight); }
resizeRenderer();
window.addEventListener('resize', resizeRenderer);

// ── Scene ─────────────────────────────────────────────────────────────────────

const scene  = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
camera.position.set(3, 4, 24);
camera.lookAt(0, 0, 0);

const knot = new THREE.Mesh(
  getGeometry(2, 3),
  new THREE.MeshPhysicalMaterial({ color: 0xcccccc, roughness: 0.35, metalness: 0.2 })
);
scene.add(knot);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(ambientLight);

const MAX_LIGHTS = 4;

const dirLights = Array.from({ length: MAX_LIGHTS }, () => {
  const l = new THREE.DirectionalLight(0xffffff, 0);
  scene.add(l);
  return l;
});

const pointLights = Array.from({ length: MAX_LIGHTS }, () => {
  const l = new THREE.PointLight(0xffffff, 0, 60, 1.5);
  scene.add(l);
  return l;
});

const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0);
scene.add(hemiLight);

// ── Pan state ─────────────────────────────────────────────────────────────────

const _startRange = window.innerWidth * 50;
let panX = Math.random() * _startRange - _startRange / 2;
let panY = Math.random() * _startRange - _startRange / 2;
let velX = 0, velY = 0;
let dragging = false, lastMX = 0, lastMY = 0;

canvas.addEventListener('wheel', e => {
  e.preventDefault();
  panX += e.deltaX; panY += e.deltaY;
}, { passive: false });

canvas.addEventListener('mousedown', e => {
  dragging = true; lastMX = e.clientX; lastMY = e.clientY; velX = velY = 0;
  canvas.style.cursor = 'grabbing';
});
window.addEventListener('mousemove', e => {
  if (!dragging) return;
  velX = lastMX - e.clientX; velY = lastMY - e.clientY;
  panX += velX; panY += velY;
  lastMX = e.clientX; lastMY = e.clientY;
});
window.addEventListener('mouseup', () => { dragging = false; canvas.style.cursor = 'grab'; });

canvas.addEventListener('touchstart', e => {
  dragging = true; lastMX = e.touches[0].clientX; lastMY = e.touches[0].clientY; velX = velY = 0;
}, { passive: true });
window.addEventListener('touchmove', e => {
  if (!dragging) return;
  velX = lastMX - e.touches[0].clientX; velY = lastMY - e.touches[0].clientY;
  panX += velX; panY += velY;
  lastMX = e.touches[0].clientX; lastMY = e.touches[0].clientY;
});
window.addEventListener('touchend', () => { dragging = false; });

// ── Render loop ───────────────────────────────────────────────────────────────

let t = 0;

(function animate() {
  requestAnimationFrame(animate);
  t += 0.004;

  if (!dragging) { panX += velX; panY += velY; velX *= 0.92; velY *= 0.92; }

  const vw = window.innerWidth, vh = window.innerHeight;
  const TILE_COLS = vw < 600 ? 2 : vw < 900 ? 4 : 6;
  const cellW = vw / TILE_COLS, cellH = cellW;

  renderer.setScissorTest(false);
  renderer.clear();
  renderer.setScissorTest(true);

  const colStart = Math.floor(panX / cellW);
  const colEnd   = Math.ceil((panX + vw) / cellW);
  const rowStart = Math.floor(panY / cellH);
  const rowEnd   = Math.ceil((panY + vh) / cellH);

  for (let row = rowStart; row < rowEnd; row++) {
    for (let col = colStart; col < colEnd; col++) {
      const screenX = col * cellW - panX;
      const screenY = row * cellH - panY;

      const scx      = Math.max(0, screenX);
      const scy_top  = Math.max(0, screenY);
      const scx2     = Math.min(vw, screenX + cellW);
      const scy_top2 = Math.min(vh, screenY + cellH);
      if (scx2 <= scx || scy_top2 <= scy_top) continue;

      renderer.setViewport(screenX * dpr, (vh - screenY - cellH) * dpr, cellW * dpr, cellH * dpr);
      renderer.setScissor(scx * dpr, (vh - scy_top2) * dpr, (scx2 - scx) * dpr, (scy_top2 - scy_top) * dpr);

      const v = generateConfig(col, row);

      scene.background = null;
      scene.fog = null;

      // Ambient
      ambientLight.color.setHSL(v.ambHue, v.ambSat, v.ambL);
      ambientLight.intensity = v.ambInt * AMB_INT_MAX;

      // Geometry: p ∈ [P_MIN, P_MAX], q ∈ [p+1, Q_MAX]
      const p = P_MIN + Math.floor(v.geoP * (P_MAX - P_MIN + 1));
      const q = (p + 1) + Math.floor(v.geoQ * (Q_MAX - p));
      knot.geometry = getGeometry(p, q);

      // Material
      const mat = knot.material;
      mat.color.setHSL(v.objHue, v.objSat, v.objL);
      mat.roughness          = v.roughness;
      mat.metalness          = v.metalness;
      mat.emissive.setHSL(v.emHue, v.emSat, v.emL);
      mat.emissiveIntensity  = v.emInt * EM_INT_MAX;
      mat.clearcoat          = v.clearcoat;
      mat.clearcoatRoughness = v.ccRough;

      // Rotation
      const rotSpeedY = v.rotY * ROT_SPEED_MAX * (v.rotSign < 0.5 ? 1 : -1);
      const rotSpeedX = v.rotX * ROT_SPEED_MAX;
      const rotAmpX   = v.rotAmp * ROT_AMP_MAX;
      const rotPhaseX = v.rotPhase * Math.PI * 2;
      knot.rotation.y = t * rotSpeedY;
      knot.rotation.x = Math.sin(t * rotSpeedX + rotPhaseX) * rotAmpX;

      // Lights
      const lightType = Math.floor(v.lightType * 3);
      const numLights = Math.floor(v.nLights * MAX_LIGHTS) + 1;

      for (let i = 0; i < MAX_LIGHTS; i++) {
        dirLights[i].intensity   = 0;
        pointLights[i].intensity = 0;
      }
      hemiLight.intensity = 0;

      if (lightType === 2) {
        hemiLight.color.setHSL(v.skyHue, v.skySat, v.skyL);
        hemiLight.groundColor.setHSL(v.gndHue, v.gndSat, v.gndL);
        hemiLight.intensity = v.hemiInt * HEMI_INT_MAX;
      }

      const pool = lightType === 1 ? pointLights : dirLights;
      for (let i = 0; i < numLights; i++) {
        const li = v.l[i];
        pool[i].color.setHSL(li.hue, li.sat, li.l);
        pool[i].intensity = li.int * LIGHT_INT_MAX;
        pool[i].position.set(
          (li.px - 0.5) * LIGHT_POS_HALF * 2,
          (li.py - 0.5) * LIGHT_POS_HALF * 2,
          li.pz * LIGHT_POS_HALF
        );
      }

      camera.aspect = cellW / cellH;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    }
  }
})();
