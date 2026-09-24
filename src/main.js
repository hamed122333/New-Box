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
import { Experience } from './experience.js';
import { state, buildStory } from './scroll/story.js';
import { ChapterUI } from './ui/chapters.js';
import { Labels } from './ui/labels.js';
import { Configurator } from './ui/configurator.js';
import { GRADES } from './data/grades.js';

const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobileMq = matchMedia('(max-width: 820px)');
const coarse = matchMedia('(pointer: coarse)').matches;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

root.classList.add('js');

function fillPaperLabels() {
  const g = GRADES.standard;
  const text = { outer: `${g.outer.name} ${g.outer.gsm} g/m²`, fluting: `${g.fluting.name} ${g.fluting.gsm} g/m²`, inner: `${g.inner.name} ${g.inner.gsm} g/m²` };
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
    new Configurator(document.querySelector('#configurateur'), { onSpec: () => {}, onCapture: () => '' });
    hideLoader();
    return;
  }

  // Les textures sont dessinées avec les polices du site : on attend leur chargement.
  await Promise.race([
    Promise.all([
      document.fonts.load('700 64px "Space Grotesk Variable"'),
      document.fonts.load('600 32px "Inter Variable"'),
      document.fonts.load('400 32px "Inter Variable"'),
    ]),
    wait(2500),
  ]).catch(() => {});

  const box = new CorrugatedBox(stage.renderer).build();
  const board = new BoardSample(stage.renderer);
  const stack = new PalletStack(stage.renderer);
  stack.build(box);
  const xp = new Experience({ stage, box, board, stack });
  const labels = new Labels(document.querySelector('[data-labels]'), board, stage.camera);

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

  const cfg = new Configurator(cfgRoot, {
    onSpec: (patch) => {
      box.build(patch);
      stack.build(box);
    },
    onCapture: () => stage.capture(),
  });

  // Quelle partie de la page est visible ?
  const visible = { story: true, config: false };
  ScrollTrigger.create({ trigger: '#story', start: 'top bottom', end: 'bottom top', onToggle: (s) => (visible.story = s.isActive) });
  ScrollTrigger.create({ trigger: cfgRoot, start: 'top bottom', end: 'bottom top', onToggle: (s) => (visible.config = s.isActive) });

  let mode = 'story';
  const setMode = (m) => {
    mode = m;
    root.dataset.mode = m;
    controls.enabled = m === 'config';
    if (m === 'config') xp.enterConfig(controls);
  };
  setMode('story');

  let last = performance.now();
  let first = true;
  gsap.ticker.add(() => {
    const now = performance.now();
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;

    const wanted = visible.config ? 'config' : 'story';
    if (wanted !== mode) setMode(wanted);

    if (mode === 'story') {
      const time = story.tl.time();
      xp.applyStory(state, reduced ? 0 : now / 1000, mobileMq.matches);
      chapters.update(time, state, visible.story);
      labels.update(state.world > 0.5 ? state.labels : 0, stage.size);
      if (visible.story || first) stage.render();
    } else {
      chapters.update(0, { world: 0, fade: 0 }, false);
      labels.update(0, stage.size);
      cfg.measure(stage.size);
      xp.applyConfig(cfg.view, controls, reduced ? 0 : dt);
      stage.render();
    }
    if (first) {
      first = false;
      hideLoader();
    }
  });

  window.addEventListener('resize', () => ScrollTrigger.refresh());
  if (coarse) root.classList.add('is-touch');

  // Accès de débogage depuis la console
  window.__newbox = { state, story, stage, box, board, stack, xp, cfg };
}

init();
