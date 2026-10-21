import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { CorrugatedBox } from '../three/box.js';
import logoUrl from '../assets/brand/logo-new-box.png';
import certsUrl from '../assets/brand/certifications.png';

// Petite caisse 3D de l'accueil, en tête des pages de présentation : rotation lente, rabats qui
// s'ouvrent et se referment, glisser pour la tourner. Rendu en pause hors de l'écran.

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
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.add(new THREE.HemisphereLight(0xfff3e0, 0x8a7560, 0.9));
  const key = new THREE.DirectionalLight(0xfff1dc, 2.2);
  key.position.set(4, 8, 6);
  scene.add(key);

  const [brandLogo, certs] = await Promise.all([loadImage(logoUrl), loadImage(certsUrl)]);
  await document.fonts.ready;
  const box = new CorrugatedBox(renderer).build({ brandLogo, certs });
  box.params.tape = 0;
  box.update();
  scene.add(box.group);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
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
    // ouverture lente des rabats : fermé → ouvert → fermé (cycle de 8 s)
    const cyc = (t % 8) / 8;
    box.params.lid = reduced ? 0.35 : Math.max(0, Math.sin(cyc * Math.PI * 2 - Math.PI / 2) * 0.5 + 0.5) * 0.85;
    box.update();
    box.group.rotation.y = -0.6 + t * 0.35 + spin;
    box.group.position.y = Math.sin(t * 1.2) * 0.06;
    const c = box.center(target);
    camera.position.set(c.x + 9.6, c.y + 4.6, c.z + 9.6);
    camera.lookAt(c.x, c.y - 0.1, c.z);
    renderer.render(scene, camera);
  };
  requestAnimationFrame(frame);
}
