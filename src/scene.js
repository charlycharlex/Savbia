// Escena 3D de la recicladora: carga del modelo, animación "Desarme",
// despiece por capas, cambio de color y etiquetas ancladas a las piezas.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const CLIP_SECONDS = 8;

// Acabados exteriores (valores lineales tomados de los tres .glb del proveedor)
export const FINISHES = {
  blanco: {
    '01': { c: [0.79, 0.775, 0.73], r: 0.28 },
    '02': { c: [0.91, 0.9, 0.86], r: 0.25 },
    '06': { c: [0.028, 0.145, 0.088], r: 0.32 },
  },
  oliva: {
    '01': { c: [0.175, 0.195, 0.08], r: 0.35 },
    '02': { c: [0.227, 0.25, 0.107], r: 0.31 },
    '06': { c: [0.745, 0.776, 0.665], r: 0.36 },
  },
  negro: {
    '01': { c: [0.005, 0.005, 0.005], r: 0.33 },
    '02': { c: [0.014, 0.014, 0.014], r: 0.29 },
    '06': { c: [0.745, 0.776, 0.665], r: 0.36 },
  },
};

// Piezas (grupos del .glb) y cómo se separan en la vista "Por dentro".
// offset = desplazamiento desde la posición de reposo, en metros.
const PARTS = [
  { key: 'tapa', node: '01_Tapa', offset: [0, 0.6, 0], closeLid: true, anchor: [0, 0.02, 0.12] },
  { key: 'cubeta', node: '02_Cubeta', offset: [0, 0.4, 0], anchor: [0.116, 0.2, 0.01] },
  { key: 'asa', node: '03_Asa', anchor: [0, 0.109, 0] },
  { key: 'filtro', node: '04_Filtro', fromEnd: true, offset: [-0.14, 0.02, 0], anchor: [0, 0.07, 0] },
  { key: 'carcasa', node: '05_Carcasa', offset: [0, 0.0, 0], xray: true, anchor: [0.157, 0.27, 0.04] },
  { key: 'camara', node: '06_Camara_termica', offset: [0, 0.0, 0], anchor: [0.128, 0.16, 0.0] },
  { key: 'base', node: '07_Base_motor', offset: [0, -0.17, 0], anchor: [0.157, 0.04, 0.03] },
];

export function createScene({ canvas, onProgress }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.85;

  const camera = new THREE.PerspectiveCamera(28, 1, 0.05, 30);

  // Luces: clave cálida con sombra suave + relleno de cielo verde salvia
  const key = new THREE.DirectionalLight(0xfff6ea, 2.2);
  key.position.set(1.2, 2.4, 1.6);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -0.8; key.shadow.camera.right = 0.8;
  key.shadow.camera.top = 1.4; key.shadow.camera.bottom = -0.6;
  key.shadow.camera.near = 0.5; key.shadow.camera.far = 6;
  key.shadow.radius = 6;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.01;
  scene.add(key);
  scene.add(new THREE.HemisphereLight(0xf4f7ef, 0x7d8a73, 0.6));
  const rim = new THREE.DirectionalLight(0xe6efe0, 1.0);
  rim.position.set(-1.8, 1.2, -1.6);
  scene.add(rim);

  // Piso que solo recibe sombra (se funde con el fondo CSS)
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.ShadowMaterial({ opacity: 0.16 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const pivot = new THREE.Group(); // gira el producto sobre su eje
  scene.add(pivot);

  const state = {
    ready: false,
    mixer: null,
    action: null,
    groups: {},
    rest: {},
    end: {},
    materials: {},
    xrayMats: [],
    labels: [],
    hotspots: [],
  };

  // Valores actuales (suavizados) y objetivo
  const cur = { az: -0.5, el: 0.12, dist: 1.4, ty: 0.17, sx: 0, sy: 0, desarme: 0, explode: 0, xray: 0, spin: 1, opacity: 1, user: 0 };
  const target = { ...cur };

  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);

  const loaded = new Promise((resolve, reject) => {
    loader.load(
      `${import.meta.env.BASE_URL}models/recicladora.glb`,
      (gltf) => {
        const root = gltf.scene;
        root.traverse((o) => {
          if (o.isMesh) {
            o.castShadow = true;
            o.receiveShadow = true;
            const m = o.material;
            if (m && m.name) {
              const code = m.name.slice(0, 2);
              state.materials[code] = state.materials[code] || [];
              if (!state.materials[code].includes(m)) state.materials[code].push(m);
            }
          }
        });
        // Centrar en X/Z usando la carcasa (sin contar el filtro trasero)
        const box = new THREE.Box3().setFromObject(root.getObjectByName('05_Carcasa'));
        const c = box.getCenter(new THREE.Vector3());
        root.position.x -= c.x;
        root.position.z -= c.z;
        pivot.add(root);

        // Carcasa con materiales propios para el modo "rayos X"
        const carcasa = root.getObjectByName('05_Carcasa');
        carcasa.traverse((o) => {
          if (o.isMesh) {
            o.material = o.material.clone();
            o.material.transparent = true;
            state.xrayMats.push(o.material);
          }
        });

        // Animación Desarme
        state.mixer = new THREE.AnimationMixer(root);
        const clip = gltf.animations.find((a) => a.name === 'Desarme') || gltf.animations[0];
        state.action = state.mixer.clipAction(clip);
        state.action.setLoop(THREE.LoopOnce, 1);
        state.action.clampWhenFinished = true;
        state.action.play();

        for (const p of PARTS) state.groups[p.key] = root.getObjectByName(p.node);
        // Pose de reposo (t=0) y final (t=8)
        state.mixer.setTime(0);
        for (const p of PARTS) state.rest[p.key] = snap(state.groups[p.key]);
        state.mixer.setTime(CLIP_SECONDS - 0.001);
        for (const p of PARTS) state.end[p.key] = snap(state.groups[p.key]);
        state.mixer.setTime(0);

        state.ready = true;
        resolve();
      },
      (e) => {
        if (e.total) onProgress?.(e.loaded / e.total);
      },
      reject
    );
  });

  function snap(o) {
    return { p: o.position.clone(), q: o.quaternion.clone() };
  }

  // ---- Cambio de acabado ----
  const colorTween = { from: null, to: null, t: 1 };
  function currentFinish() {
    const out = {};
    for (const code of ['01', '02', '06']) {
      const m = state.materials[code]?.[0];
      if (m) out[code] = { c: [m.color.r, m.color.g, m.color.b], r: m.roughness };
    }
    return out;
  }
  function setFinish(name, instant = false) {
    if (!state.ready) return loaded.then(() => setFinish(name, instant));
    colorTween.from = currentFinish();
    colorTween.to = FINISHES[name];
    colorTween.t = instant ? 1 : 0;
    applyFinish(instant ? 1 : 0);
  }
  function applyFinish(k) {
    const { from, to } = colorTween;
    if (!to) return;
    const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    for (const code of Object.keys(to)) {
      const a = from[code] || to[code];
      const b = to[code];
      const mats = [...(state.materials[code] || [])];
      // las copias de la carcasa también cambian
      for (const xm of state.xrayMats) if (xm.name.startsWith(code)) mats.push(xm);
      for (const m of mats) {
        m.color.setRGB(a.c[0] + (b.c[0] - a.c[0]) * e, a.c[1] + (b.c[1] - a.c[1]) * e, a.c[2] + (b.c[2] - a.c[2]) * e);
        m.roughness = a.r + (b.r - a.r) * e;
      }
    }
  }

  // ---- Etiquetas HTML ancladas a piezas ----
  function registerLabel(el, partKey, kind = 'label') {
    const p = PARTS.find((x) => x.key === partKey);
    const item = { el, part: partKey, anchor: new THREE.Vector3(...p.anchor), kind };
    (kind === 'hotspot' ? state.hotspots : state.labels).push(item);
    return item;
  }

  // ---- Bucle ----
  const tmpV = new THREE.Vector3();
  const tmpQ = new THREE.Quaternion();
  const clock = new THREE.Clock();
  let w = 1, h = 1;
  let reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let elapsed = 0;

  function resize() {
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    for (const it of state.labels) it.width = 0; // se vuelven a medir
  }
  window.addEventListener('resize', resize);
  resize();

  function damp(a, b, lambda, dt) {
    return a + (b - a) * (1 - Math.exp(-lambda * dt));
  }

  function poseParts() {
    const e = smooth(cur.explode);
    for (const p of PARTS) {
      const g = state.groups[p.key];
      if (!g) continue;
      if (e <= 0.0001) continue; // el mixer ya dejó la pose de la animación
      const from = { p: g.position.clone(), q: g.quaternion.clone() };
      const base = p.fromEnd ? state.end[p.key] : state.rest[p.key];
      tmpV.copy(base.p);
      if (p.offset) tmpV.add(new THREE.Vector3(...p.offset));
      if (p.key === 'asa') tmpQ.copy(state.end.asa.q);
      else if (p.closeLid) tmpQ.copy(state.rest[p.key].q);
      else tmpQ.copy(base.q);
      g.position.lerpVectors(from.p, tmpV, e);
      g.quaternion.slerpQuaternions(from.q, tmpQ, e);
    }
    // Rayos X de la carcasa
    const x = cur.xray;
    for (const m of state.xrayMats) {
      m.opacity = 1 - 0.84 * x;
      m.depthWrite = x < 0.05;
    }
    ground.position.y = -0.17 * e - 0.0005;
    ground.material.opacity = 0.16 * (1 - 0.7 * e);
  }

  function smooth(t) {
    t = Math.min(1, Math.max(0, t));
    return t * t * (3 - 2 * t);
  }

  const labelVis = { label: 0, hotspot: 0 };
  let activeHotspot = null;

  function updateLabels() {
    const project = (item) => {
      const g = state.groups[item.part];
      tmpV.copy(item.anchor);
      g.localToWorld(tmpV);
      tmpV.project(camera);
      return { x: (tmpV.x * 0.5 + 0.5) * w, y: (-tmpV.y * 0.5 + 0.5) * h, z: tmpV.z };
    };
    // centro del producto en pantalla, para decidir lado
    tmpV.set(0, 0.2, 0);
    pivot.localToWorld(tmpV);
    tmpV.project(camera);
    const cx = (tmpV.x * 0.5 + 0.5) * w;

    const lv = Math.min(1, Math.max(0, (cur.explode - 0.75) / 0.2)) * cur.opacity;
    const gap = w <= 720 ? 28 : 60;
    for (const it of state.labels) {
      const s = project(it);
      if (lv > 0 && !it.width) it.width = it.el.querySelector('span').offsetWidth;
      let side = s.x < cx - 4 ? 'left' : 'right';
      // si la etiqueta no cabe en pantalla, se pasa al otro lado
      if (side === 'right' && s.x + gap + it.width > w - 8) side = 'left';
      else if (side === 'left' && s.x - gap - it.width < 8) side = 'right';
      it.el.dataset.side = side;
      it.el.style.transform = `translate3d(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px, 0)`;
      it.el.style.opacity = lv.toFixed(3);
    }
    for (const it of state.hotspots) {
      const s = project(it);
      it.el.style.transform = `translate3d(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px, 0)`;
      const on = it.part === activeHotspot && cur.explode < 0.05;
      it.el.classList.toggle('is-on', on && cur.opacity > 0.6);
    }
  }

  function frame() {
    tick(Math.min(clock.getDelta(), 0.05));
    requestAnimationFrame(frame);
  }

  function tick(dt) {
    elapsed += dt;
    // suavizado (la rueda ya viene suavizada por Lenis; esto quita saltos)
    const L = 7;
    for (const k of Object.keys(target)) cur[k] = damp(cur[k], target[k], k === 'opacity' ? 9 : L, dt);

    if (state.ready) {
      // La animación solo mueve algunos canales (p. ej. la tapa solo rota):
      // partimos siempre de la pose de reposo para no arrastrar el despiece.
      for (const p of PARTS) {
        const g = state.groups[p.key];
        g.position.copy(state.rest[p.key].p);
        g.quaternion.copy(state.rest[p.key].q);
      }
      state.mixer.setTime(Math.min(CLIP_SECONDS - 0.001, Math.max(0, cur.desarme) * CLIP_SECONDS));
      poseParts();
      if (colorTween.t < 1) {
        colorTween.t = Math.min(1, colorTween.t + dt / 0.9);
        applyFinish(colorTween.t);
      }
    }

    // Balanceo idle + rotación del usuario
    const sway = reduced ? 0 : Math.sin(elapsed * 0.35) * 0.22 * cur.spin;
    pivot.rotation.y = sway + cur.user;

    // Cámara orbital
    const narrow = camera.aspect < 0.85;
    const distMul = narrow ? Math.max(1, 0.78 / camera.aspect) : 1;
    const d = cur.dist * distMul;
    const ce = Math.cos(cur.el);
    camera.position.set(Math.sin(cur.az) * ce * d, cur.ty + Math.sin(cur.el) * d, Math.cos(cur.az) * ce * d);
    camera.lookAt(0, cur.ty, 0);
    // Desplazar el producto en pantalla sin deformar la perspectiva
    camera.setViewOffset(w, h, -cur.sx * w, cur.sy * h, w, h);

    canvas.style.opacity = cur.opacity.toFixed(3);
    if (cur.opacity > 0.01) {
      renderer.render(scene, camera);
      if (state.ready) updateLabels();
    }
  }
  requestAnimationFrame(frame);

  // Solo para pruebas: avanza n cuadros sin depender de requestAnimationFrame
  function step(n = 60, dt = 1 / 30) {
    for (let i = 0; i < n; i++) tick(dt);
  }

  return {
    loaded,
    target,
    cur,
    setFinish,
    registerLabel,
    setActiveHotspot: (k) => (activeHotspot = k),
    setReduced: (v) => (reduced = v),
    resize,
    step,
  };
}
