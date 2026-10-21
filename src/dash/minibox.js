import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { CorrugatedBox } from '../three/box.js';
import logoUrl from '../assets/brand/logo-new-box.png';
import certsUrl from '../assets/brand/certifications.png';

// Petite caisse 3D de l'accueil (même modèle, mêmes couleurs et lumière), en tête des pages de
// présentation : balancement lent, glisser pour la tourner. Rendu en pause hors de l'écran.

const loadImage = (src) =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });

export async function miniBox(canvas) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch {
    canvas.hidden = true;
    return;
  }
  // mêmes réglages que la scène « caisse » de l'accueil (src/three/stage.js)
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;
  scene.add(new THREE.HemisphereLight(0xfff3e0, 0x8a7560, 0.9));
  const key = new THREE.DirectionalLight(0xfff1dc, 2.4);
  key.position.set(8, 16, 10);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  key.shadow.radius = 5;
  Object.assign(key.shadow.camera, { left: -12, right: 12, top: 16, bottom: -8, near: 1, far: 50 });
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xdfe8ff, 0.6);
  fill.position.set(-10, 6, -4);
  scene.add(fill);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.ShadowMaterial({ color: 0x3a2716, opacity: 0.2 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.005;
  ground.receiveShadow = true;
  scene.add(ground);

  const [brandLogo, certs] = await Promise.all([loadImage(logoUrl), loadImage(certsUrl)]);
  await document.fonts.ready;
  // caisse de l'accueil : fermée, ruban adhésif posé
  const box = new CorrugatedBox(renderer).build({ brandLogo, certs });
  box.params.lid = 0;
  box.params.tape = 1;
  box.update();
  scene.add(box.group);

  const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 400);
  const target = box.center(new THREE.Vector3());
  const resize = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(canvas);
  resize();

  // glisser pour tourner
  let drag = null;
  let spin = 0;
  canvas.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, spin };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => drag && (spin = drag.spin + (e.clientX - drag.x) * 0.01));
  canvas.addEventListener('pointerup', () => (drag = null));

  let visible = true;
  new IntersectionObserver((e) => (visible = e[0].isIntersecting)).observe(canvas);

  const t0 = performance.now();
  const frame = (now) => {
    requestAnimationFrame(frame);
    if (!visible) return;
    const t = reduced ? 0 : (now - t0) / 1000;
    // balancement de la caisse comme à l'ouverture de l'accueil (rotY −0,22, idle)
    box.group.rotation.y = -0.22 + 0.28 * Math.sin(t * 0.45) + spin;
    const c = box.center(target);
    camera.position.set(c.x + 6.2 * 0.9, c.y + 5.4 * 0.9, c.z + 10.2 * 0.9);
    camera.lookAt(0, c.y - 0.1, 0);
    renderer.render(scene, camera);
  };
  requestAnimationFrame(frame);
}
