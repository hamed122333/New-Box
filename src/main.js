import '@fontsource-variable/inter';
import '@fontsource-variable/space-grotesk';
import './styles/main.css';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import { Stage } from './three/stage.js';
import { CorrugatedBox } from './three/box.js';
import { BoardSample } from './three/board.js';
import { PalletStack } from './three/stack.js';
import { warmTextureSteps, prepareLogo } from './three/textures.js';
import { Experience } from './experience.js';
import { state, buildStory } from './scroll/story.js';
import { ChapterUI } from './ui/chapters.js';
import { Labels } from './ui/labels.js';
import { Configurator } from './ui/configurator.js';
import { PAPERS, STORY_PAPERS } from './data/papers.js';
import { afterNextPaint, yieldToMain } from './lib/schedule.js';
import logoUrl from './assets/brand/logo-new-box.png';
// WebP (13 Ko) à pleine résolution pour la texture ; PNG de secours si le navigateur ne décode pas le WebP
import certsUrl from './assets/brand/certifications.webp';
import certsPngUrl from './assets/brand/certifications.png';


const root = document.documentElement;
// le module s'exécute : le repli « sans JS » du script du <head> est désarmé (voir index.html)
window.__nbBoot?.();
// ?capture : horloge pilotée de l'extérieur (enregistrement vidéo image par image)
const capture = new URLSearchParams(location.search).has('capture');
const reduced = capture || matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobileMq = matchMedia('(max-width: 820px)');
const coarse = matchMedia('(pointer: coarse)').matches;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
// Chargement : chaque étape coûteuse (éclairage, texture, caisse…) dans sa propre tâche,
// pour que le fil principal reste disponible entre deux (TBT, premiers clics).
const step = async (fn) => {
  await yieldToMain();
  return fn();
};

root.classList.add('js'); // déjà posé par le script du <head> (index.html) ; conservé par sécurité
document.querySelectorAll('[data-year]').forEach((el) => (el.textContent = new Date().getFullYear()));

function fillPaperLabels() {
  const label = (p) => `${p.code} · ${p.name} ${p.gsm} g/m²`;
  const text = { outer: label(PAPERS[STORY_PAPERS.outer]), fluting: label(PAPERS.FL), inner: label(PAPERS[STORY_PAPERS.inner]) };
  document.querySelectorAll('[data-paper]').forEach((el) => (el.textContent = text[el.dataset.paper] ?? ''));
}

function setupScroll() {
  let lenis = null;
  if (!reduced) {
    lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  document.querySelectorAll('a[href^="#"]').forEach((a) =>
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      const el = id.length > 1 && document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(el, { duration: 1.6 });
      else el.scrollIntoView();
    }),
  );
  return lenis;
}

/**
 * Pendant l'écran de chargement : compile les shaders et envoie les textures au GPU pour
 * tous les états (palette, vue macro, test ECT, double cannelure). Sans cela, le premier
 * passage dans ces scènes bloque le fil principal et retarde les clics (INP).
 */
/**
 * Attend, sans bloquer le fil principal, que le GPU ait fini les commandes envoyées (WebGL2 :
 * fenceSync sondé à chaque image ; sinon simple flush). Sans cela, tout le travail GPU de la
 * pré-compilation tombe sur la première image visible et la page se fige à l'apparition de la 3D.
 */
async function gpuIdle(gl, max = 10000) {
  gl.flush();
  if (!gl.fenceSync) return;
  const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
  if (!sync) return;
  gl.flush();
  const t0 = performance.now();
  while (gl.getSyncParameter(sync, gl.SYNC_STATUS) !== gl.SIGNALED && performance.now() - t0 < max) await wait(16);
  gl.deleteSync(sync);
}

async function warmUp({ stage, board, stack, xp }) {
  const r = stage.renderer;
  const gl = r.getContext();
  stack.update(1);
  xp.rig.visible = true;
  board.setState({ from: 'BC', to: 'BC', t: 0, explode: 0 });
  try {
    await Promise.race([
      Promise.all([r.compileAsync(stage.boxScene, stage.camera), r.compileAsync(stage.macroScene, stage.camera)]),
      wait(4000),
    ]);
    // envoi des textures au GPU (rastérisation différée des Canvas comprise) : une par tâche
    const maps = new Set();
    for (const scene of [stage.boxScene, stage.macroScene])
      scene.traverse((o) =>
        [o.material].flat().forEach((m) => m && ['map', 'bumpMap', 'alphaMap'].forEach((k) => m[k] && maps.add(m[k]))),
      );
    for (const tex of maps)
      await step(() => {
        r.initTexture(tex);
        gl.flush(); // le GPU commence l'envoi pendant que le fil principal reprend la main
      });
    // un rendu de chaque monde finalise programmes et ombres (compileAsync ne compile pas
    // les programmes d'ombre) : une tâche chacun
    await step(() => {
      stage.world = 'box';
      stage.render();
    });
    await step(() => {
      stage.world = 'macro';
      stage.render();
    });
  } catch (err) {
    console.warn('Pré-compilation incomplète :', err);
  }
  stage.world = 'box';
  stack.update(0);
  xp.rig.visible = false;
  board.setState({ from: 'C', to: 'C', t: 0, explode: 0 });
}

function hideLoader() {
  const l = document.querySelector('[data-loader]');
  root.dataset.ready = ''; // la 3D apparaît en fondu, le héros garde sa place (voir main.css)
  // masqué sans être retiré : un retrait du DOM ajouterait un layout juste après l'apparition de la 3D
  l.classList.add('is-done');
}

// Le configurateur est écrit dans le HTML : tant qu'il n'est pas branché (fin du chargement),
// il reste inerte et signalé « occupé » pour que rien de ce qui y est saisi ne soit perdu.
const cfgPanel = document.querySelector('#configurateur .config__panel');
let cfgInstance = null; // une seule instance (3D ou repli sans 3D)
let stage = null;
let tick = null;
const setConfigReady = (ok) => {
  cfgPanel.inert = !ok;
  if (ok) cfgPanel.removeAttribute('aria-busy');
  else cfgPanel.setAttribute('aria-busy', 'true');
};
const configWithout3D = () => {
  cfgInstance ??= new Configurator(document.querySelector('#configurateur'), { onSpec: () => {}, onCapture: async () => null });
};
setConfigReady(false);

async function init() {
  fillPaperLabels();
  const canvas = document.querySelector('#webgl');

  // Les textures sont dessinées avec les polices du site et le logo officiel : leur chargement
  // part tout de suite, avant la création du renderer.
  const logoPromise = loadImage(logoUrl).catch(() => null);
  const certsPromise = loadImage(certsUrl) // SGS FSSC 22000 · ISO 9001 · ISO 45001, FSC
    .catch(() => loadImage(certsPngUrl))
    .catch(() => null);
  const fontsPromise = Promise.all([
    document.fonts.load('700 64px "Space Grotesk Variable"'),
    document.fonts.load('600 32px "Inter Variable"'),
    document.fonts.load('400 32px "Inter Variable"'),
  ]).catch(() => {});

  try {
    stage = new Stage(canvas);
  } catch (err) {
    console.warn('WebGL indisponible :', err);
    root.classList.add('no-webgl');
    setupScroll();
    configWithout3D();
    setConfigReady(true);
    hideLoader();
    return;
  }

  // Attente plafonnée des polices et du logo ; le fil principal reste libre pendant ce temps :
  // on y prépare l'éclairage d'ambiance et les textures sans texte, une étape par tâche.
  const assets = Promise.race([Promise.all([fontsPromise, logoPromise, certsPromise]), wait(2500)]).catch(() => {});
  const aniso = Math.min(8, stage.renderer.capabilities.getMaxAnisotropy());
  await step(() => stage.initEnvironment());
  for (const fn of warmTextureSteps(aniso)) await step(fn);
  await assets;
  const ready = (p) => Promise.race([p, wait(0).then(() => null)]);
  const brandLogo = await ready(logoPromise);
  const certs = await ready(certsPromise);

  // faces imprimées (polices, logo), échantillon, palette : une étape chacun
  await step(() => prepareLogo(brandLogo));
  const box = await step(() => new CorrugatedBox(stage.renderer).build({ brandLogo, certs }));
  const board = await step(() => new BoardSample(stage.renderer));
  const stack = await step(() => {
    const s = new PalletStack(stage.renderer);
    s.build(box);
    return s;
  });
  const xp = new Experience({ stage, box, board, stack });
  const labels = new Labels(document.querySelector('[data-labels]'), board, stage.camera);
  await warmUp({ stage, board, stack, xp });

  await yieldToMain();
  const story = buildStory({ reduced });
  const chapters = new ChapterUI(story);
  setupScroll();

  const controls = new OrbitControls(stage.camera, canvas);
  controls.enabled = false;
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.rotateSpeed = 0.7;
  controls.minPolarAngle = 0.2;
  controls.maxPolarAngle = Math.PI / 2 - 0.04;
  controls.addEventListener('start', () => {
    cfg.view.autoRotate = false;
    document.querySelector('input[name="autorotate"]').checked = false;
  });

  const cfgRoot = document.querySelector('#configurateur');
  // Sur mobile, le panneau défile dans son propre conteneur : Lenis doit le laisser faire.
  const panel = cfgRoot.querySelector('.config__panel');
  const syncPanelScroll = () => panel.toggleAttribute('data-lenis-prevent', mobileMq.matches);
  mobileMq.addEventListener('change', syncPanelScroll);
  syncPanelScroll();

  // Rendu à la demande : la scène n'est redessinée que si la caméra ou un objet a bougé.
  // Toute reconstruction (box.build, stack.build) doit appeler invalidate().
  let dirty = true;
  const invalidate = () => (dirty = true);
  const lastSig = new Float64Array(22).fill(NaN);
  let lastBoard = '';
  const sceneChanged = () => {
    const c = stage.camera;
    const g = box.group;
    const p = box.params;
    const sig = [
      c.position.x, c.position.y, c.position.z,
      c.quaternion.x, c.quaternion.y, c.quaternion.z, c.quaternion.w,
      stage.shift.x, stage.shift.y, c.aspect, stage.world === 'macro' ? 1 : 0,
      g.rotation.y, g.position.x, g.position.z, p.lid, p.flat, p.tape, stack.progress ?? 0,
      board.group.rotation.x, board.group.scale.z, xp.plateTop.position.y, xp.rig.visible ? 1 : 0,
    ];
    let changed = dirty || board._key !== lastBoard;
    dirty = false;
    lastBoard = board._key;
    for (let i = 0; i < sig.length; i++) {
      if (Math.abs(sig[i] - lastSig[i]) <= 1e-6) continue; // NaN au départ : toujours différent
      lastSig[i] = sig[i];
      changed = true;
    }
    return changed;
  };
  window.addEventListener('resize', invalidate);
  document.addEventListener('visibilitychange', invalidate);
  canvas.addEventListener('webglcontextrestored', invalidate);

  // la palette n'est visible que dans le récit : on la recalcule en y revenant
  let stackDirty = false;
  const cfg = (cfgInstance = new Configurator(cfgRoot, {
    onSpec: (patch, opts) => {
      box.build(patch, opts);
      stackDirty = true;
      invalidate();
    },
    onCapture: () => {
      const blob = stage.capture(); // rendu centré : l'image suivante rétablit le décalage
      invalidate();
      return blob;
    },
  }));
  setConfigReady(true);

  // Quelle partie de la page est visible ?
  const visible = { story: true, config: false };
  ScrollTrigger.create({
    trigger: '#story',
    start: 'top bottom',
    end: 'bottom top',
    onToggle: (s) => {
      visible.story = s.isActive;
      invalidate();
    },
  });
  // le rail des chapitres (au milieu de l'écran) disparaît dès que le récit quitte le centre
  ScrollTrigger.create({ trigger: '#story', start: 'top center', end: 'bottom 55%', onToggle: (s) => (root.dataset.story = s.isActive ? 'on' : 'off') });
  ScrollTrigger.create({ trigger: cfgRoot, start: 'top bottom', end: 'bottom top', onToggle: (s) => (visible.config = s.isActive) });

  let mode = 'story';
  const setMode = (m) => {
    mode = m;
    invalidate();
    root.dataset.mode = m;
    controls.enabled = m === 'config';
    if (m === 'config') {
      // le récit montre toujours une caisse imprimée : on rétablit le produit choisi
      if (box.spec.product !== cfg.spec.product)
        afterNextPaint(() => {
          box.build({ product: cfg.spec.product });
          invalidate();
        });
      xp.enterConfig(controls);
      return;
    }
    const needCase = box.family !== 'caisse' || !box.product.printed;
    if (!needCase && !stackDirty) return;
    afterNextPaint(() => {
      if (needCase) box.build({ product: 'CI' });
      stack.build(box);
      stackDirty = false;
      invalidate();
    });
  };
  setMode('story');

  let first = true;
  const frame = (dt, t) => {
    const wanted = visible.config ? 'config' : 'story';
    if (wanted !== mode) setMode(wanted);

    if (mode === 'story') {
      const time = story.tl.time();
      xp.applyStory(state, t, mobileMq.matches);
      chapters.update(time, state, visible.story);
      labels.update(state.world > 0.5 ? state.labels : 0, stage.size);
      if ((visible.story || first) && sceneChanged()) stage.render();
    } else {
      chapters.update(0, { world: 0, fade: 0 }, false);
      labels.update(0, stage.size);
      cfg.measure(stage.size);
      xp.applyConfig(cfg.view, controls, dt);
      if (sceneChanged()) stage.render();
    }
    if (first) {
      first = false;
      hideLoader();
      // le canevas devient visible : on redessine à l'image suivante (même scène immobile,
      // en mouvement réduit), le 1er rendu ayant été fait canevas masqué
      invalidate();
    }
  };

  // le GPU finit la pré-compilation sans bloquer le fil principal (héros et configurateur déjà
  // utilisables) ; la 3D apparaît ensuite, à la 1re image
  await gpuIdle(stage.renderer.getContext());

  let last = performance.now();
  let clock = 0;
  gsap.ticker.add((tick = () => {
    const now = performance.now();
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (capture) {
      if (first) frame(0, 0);
      return;
    }
    frame(reduced ? 0 : dt, reduced ? 0 : now / 1000);
  }));

  window.addEventListener('resize', () => ScrollTrigger.refresh());
  if (coarse) root.classList.add('is-touch');

  // Accès de débogage depuis la console (+ pilotage image par image en mode ?capture)
  window.__newbox = {
    state,
    story,
    stage,
    box,
    board,
    stack,
    xp,
    cfg,
    ScrollTrigger,
    invalidate, // force le prochain rendu (rendu à la demande)
    step(dt) {
      clock += dt;
      ScrollTrigger.update();
      invalidate(); // enregistrement image par image : toujours redessiner
      frame(dt, clock);
    },
  };
}

init().catch((err) => {
  console.error('Initialisation de la 3D interrompue :', err);
  // mise en page sans 3D d'abord : quoi qu'il arrive ensuite, la page ne reste pas en chargement
  root.classList.add('no-webgl');
  hideLoader();
  if (tick) gsap.ticker.remove(tick);
  stage?.renderer.dispose();
  // estimations et devis restent disponibles sans la 3D (comme le chemin sans WebGL)
  try {
    configWithout3D();
    setConfigReady(true);
  } catch (e) {
    console.error('Configurateur indisponible :', e);
  }
});
