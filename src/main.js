import '@fontsource-variable/inter';
import '@fontsource-variable/space-grotesk';
import './styles/main.css';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import { Stage } from './three/stage.js';
import { CorrugatedBox } from './three/box.js';
import { BoardSample } from './three/board.js';
import { PalletStack } from './three/stack.js';
import { Lineup } from './three/lineup.js';
import { DieCutModel } from './three/models.js';
import { Experience } from './experience.js';
import { state, buildStory } from './scroll/story.js';
import { ChapterUI } from './ui/chapters.js';
import { Labels } from './ui/labels.js';
import { Tags } from './ui/tags.js';
import { Configurator } from './ui/configurator.js';
import { PAPERS, STORY_PAPERS } from './data/papers.js';
import { afterNextPaint } from './lib/schedule.js';
import logoUrl from './assets/brand/logo-new-box.png';
import certsUrl from './assets/brand/certifications.png';

const root = document.documentElement;
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

root.classList.add('js');

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
async function warmUp({ stage, board, stack, xp, lineup }) {
  const r = stage.renderer;
  stack.update(1);
  xp.rig.visible = true;
  lineup.group.visible = true;
  lineup.update();
  board.setState({ from: 'BC', to: 'BC', t: 0, explode: 0 });
  try {
    await Promise.race([
      Promise.all([r.compileAsync(stage.boxScene, stage.camera), r.compileAsync(stage.macroScene, stage.camera)]),
      wait(4000),
    ]);
    // un rendu de chaque monde finalise programmes, ombres et textures
    stage.world = 'box';
    stage.render();
    stage.world = 'macro';
    stage.render();
  } catch (err) {
    console.warn('Pré-compilation incomplète :', err);
  }
  stage.world = 'box';
  stack.update(0);
  xp.rig.visible = false;
  board.setState({ from: 'C', to: 'C', t: 0, explode: 0 });
}

/**
 * Vignettes 3D de la vitrine « Notre gamme » : chaque produit est rendu seul, cadré, puis copié
 * dans le canvas 2D de sa carte. Fait une seule fois, sous l'écran de chargement.
 */
function renderThumbs({ stage, box, stack, lineup, diecut }) {
  const targets = new Map([...document.querySelectorAll('canvas[data-thumb]')].map((c) => [c.dataset.thumb, c.getContext('2d')]));
  if (!targets.size) return;
  const groups = [box.group, stack.group, lineup.group, diecut.group];
  const before = groups.map((g) => g.visible);
  const dir = new THREE.Vector3(0.7, 0.62, 1).normalize();
  const center = new THREE.Vector3();
  const only = (g) => groups.forEach((x) => (x.visible = x === g));
  const shotBox = (id, patch, params, d = dir) => {
    const ctx = targets.get(id);
    if (!ctx) return;
    if (patch) box.build(patch);
    Object.assign(box.params, { lid: 0, flat: 0, tape: 1 }, params);
    box.update();
    box.group.position.set(0, 0, 0);
    box.group.rotation.set(0, 0, 0);
    only(box.group);
    box.center(center);
    const lidK = box.family === 'caisse' ? box.params.lid * box.fh : 0;
    const radius = box.family === 'plaque' ? Math.hypot(box.L, box.W) / 2 : Math.hypot(box.L, box.W, box.H + lidK) / 2;
    stage.snapshot(ctx, { center, radius, dir: d });
  };
  try {
    const keep = { product: box.spec.product, L: box.spec.L, W: box.spec.W, H: box.spec.H, flute: box.spec.flute };
    shotBox('caisse', null, {});
    shotBox('caisse-decoupee', { product: 'CID', L: 400, W: 300, H: 250, flute: 'B' }, { lid: 0.72, tape: 0 });
    shotBox('plaque', { product: 'PLR', L: 1200, W: 800 }, {}, new THREE.Vector3(0.45, 0.5, 1).normalize());
    box.build(keep);
    // découpes : chaque modèle de la gamme, seul, ouvert et rempli
    only(lineup.group);
    stage.setShadowSpan(1.35);
    lineup.update({ open: 1, fill: 1, build: 1 });
    for (const it of lineup.items) {
      const ctx = targets.get(it.id);
      if (!ctx) continue;
      lineup.items.forEach((o) => (o.model.group.visible = o === it));
      const m = it.model;
      m.group.updateMatrixWorld(true);
      m.group.localToWorld(m.center(center));
      const side = new THREE.Vector3(dir.x, dir.y, dir.z).applyAxisAngle(new THREE.Vector3(0, 1, 0), it.rotY);
      stage.snapshot(ctx, { center, radius: m.radius(), dir: side, fill: it.id === 'pizza' ? 0.95 : 0.88 });
    }
    lineup.items.forEach((o) => (o.model.group.visible = true));
    stage.setShadowSpan(1);
    document.documentElement.classList.add('has-thumbs');
  } catch (err) {
    console.warn('Vignettes incomplètes :', err);
  }
  groups.forEach((g, i) => (g.visible = before[i]));
}

/** Liens « Personnaliser » (vitrine, récit, étiquettes) : préréglage du configurateur, puis défilement. */
function bindPresets(cfg) {
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-preset]');
    if (!el) return;
    let preset;
    try {
      preset = JSON.parse(el.dataset.preset);
    } catch {
      return;
    }
    cfg.preset(preset);
  });
}

function hideLoader() {
  const l = document.querySelector('[data-loader]');
  l.classList.add('is-done');
  setTimeout(() => l.remove(), 900);
}

async function init() {
  fillPaperLabels();
  const canvas = document.querySelector('#webgl');

  let stage;
  try {
    stage = new Stage(canvas);
  } catch (err) {
    console.warn('WebGL indisponible :', err);
    root.classList.add('no-webgl');
    setupScroll();
    bindPresets(new Configurator(document.querySelector('#configurateur'), { onSpec: () => {}, onCapture: async () => null }));
    hideLoader();
    return;
  }

  // Les textures sont dessinées avec les polices du site et le logo officiel : on attend leur chargement.
  const logoPromise = loadImage(logoUrl).catch(() => null);
  const certsPromise = loadImage(certsUrl).catch(() => null); // SGS FSSC 22000 · ISO 9001 · ISO 45001, FSC
  await Promise.race([
    Promise.all([
      document.fonts.load('700 64px "Space Grotesk Variable"'),
      document.fonts.load('600 32px "Inter Variable"'),
      document.fonts.load('400 32px "Inter Variable"'),
      logoPromise,
      certsPromise,
    ]),
    wait(2500),
  ]).catch(() => {});
  const ready = (p) => Promise.race([p, wait(0).then(() => null)]);
  const brandLogo = await ready(logoPromise);
  const certs = await ready(certsPromise);

  const box = new CorrugatedBox(stage.renderer).build({ brandLogo, certs });
  const board = new BoardSample(stage.renderer);
  const stack = new PalletStack(stage.renderer);
  stack.build(box);
  const lineup = new Lineup(stage.renderer).build({ brandLogo });
  const diecut = new DieCutModel(stage.renderer); // sujet du configurateur pour DI / DV, construit à la demande
  const xp = new Experience({ stage, box, board, stack, lineup, diecut });
  const labels = new Labels(document.querySelector('[data-labels]'), board, stage.camera);
  const tags = new Tags(document.querySelector('[data-tags]'), { lineup, box, camera: stage.camera });
  const t0 = performance.now();
  await warmUp({ stage, board, stack, xp, lineup });
  const t1 = performance.now();
  renderThumbs({ stage, box, stack, lineup, diecut });
  const timings = { warmUp: Math.round(t1 - t0), thumbs: Math.round(performance.now() - t1) };

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

  // la palette n'est visible que dans le récit : on la recalcule en y revenant
  let stackDirty = false;
  // Le configurateur pilote la caisse (caisses, plaques) ou le modèle de découpe (DI / DV) :
  // on transmet au sujet concerné tout ce qui diffère de la spécification affichée.
  const BOX_KEYS = ['product', 'L', 'W', 'H', 'flute', 'outer', 'inner', 'ink', 'logo'];
  const DIE_KEYS = [...BOX_KEYS, 'style'];
  const useDie = () => cfg.product.family === 'decoupe';
  const diff = (spec, keys) => {
    const d = {};
    for (const k of keys) if (spec[k] !== cfg.spec[k]) d[k] = cfg.spec[k];
    return d;
  };
  const syncSubject = (opts) => {
    if (useDie()) {
      diecut.build({ ...diff(diecut.spec, DIE_KEYS), brandLogo }, diecut.mats ? opts : {});
      return;
    }
    box.build(diff(box.spec, BOX_KEYS), opts);
    stackDirty = true;
  };
  const cfg = new Configurator(cfgRoot, {
    onSpec: (patch, opts) => syncSubject(opts),
    onCapture: () => stage.capture(),
  });
  bindPresets(cfg);

  // Quelle partie de la page est visible ?
  const visible = { story: true, config: false };
  ScrollTrigger.create({ trigger: '#story', start: 'top bottom', end: 'bottom top', onToggle: (s) => (visible.story = s.isActive) });
  // le rail des chapitres (au milieu de l'écran) disparaît dès que le récit quitte le centre
  ScrollTrigger.create({ trigger: '#story', start: 'top center', end: 'bottom 55%', onToggle: (s) => (root.dataset.story = s.isActive ? 'on' : 'off') });
  ScrollTrigger.create({ trigger: cfgRoot, start: 'top bottom', end: 'bottom top', onToggle: (s) => (visible.config = s.isActive) });

  let mode = 'story';
  const setMode = (m) => {
    mode = m;
    root.dataset.mode = m;
    controls.enabled = m === 'config';
    if (m === 'config') {
      // le récit montre toujours une caisse imprimée : on rétablit le produit choisi
      const subject = useDie() ? diecut : box;
      const stale = !subject.mats || Object.keys(diff(subject.spec, useDie() ? DIE_KEYS : BOX_KEYS)).length > 0;
      if (stale) afterNextPaint(() => syncSubject({}));
      xp.enterConfig(controls, useDie());
      return;
    }
    const needCase = box.family !== 'caisse' || !box.product.printed;
    if (!needCase && !stackDirty) return;
    afterNextPaint(() => {
      if (needCase) box.build({ product: 'CI' });
      stack.build(box);
      stackDirty = false;
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
      tags.update(visible.story && state.world < 0.5 && state.range > 0.5 ? state.rangeTags : 0, stage.size);
      if (visible.story || first) stage.render();
    } else {
      chapters.update(0, { world: 0, fade: 0 }, false);
      labels.update(0, stage.size);
      tags.update(0, stage.size);
      cfg.measure(stage.size);
      xp.applyConfig(cfg.view, controls, dt, useDie());
      stage.render();
    }
    if (first) {
      first = false;
      hideLoader();
    }
  };

  let last = performance.now();
  let clock = 0;
  gsap.ticker.add(() => {
    const now = performance.now();
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (capture) {
      if (first) frame(0, 0);
      return;
    }
    frame(reduced ? 0 : dt, reduced ? 0 : now / 1000);
  });

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
    lineup,
    diecut,
    xp,
    cfg,
    timings,
    ScrollTrigger,
    step(dt) {
      clock += dt;
      ScrollTrigger.update();
      frame(dt, clock);
    },
  };
}

init();
