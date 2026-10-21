import '@fontsource-variable/inter';
import '@fontsource-variable/space-grotesk';
import '../styles/premium.css';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';

// Effets des pages Partenaires et Grands comptes : versions JavaScript natives (GSAP) des
// composants react-bits Split Text, Spotlight Card, Magnet, Count Up, Scroll Velocity et Aurora.
gsap.registerPlugin(ScrollTrigger, SplitText);

const root = document.documentElement;
export const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(pointer: fine)').matches;

root.classList.add('js');
document.querySelectorAll('[data-year]').forEach((el) => (el.textContent = new Date().getFullYear()));

function smoothScroll() {
  let lenis = null;
  if (!reduced) {
    lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 0.95 });
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
      if (lenis) lenis.scrollTo(el, { offset: -72, duration: 1.4 });
      else el.scrollIntoView();
    }),
  );
  return lenis;
}

function header() {
  const el = document.querySelector('.p-header');
  if (!el) return;
  ScrollTrigger.create({
    start: 80,
    onToggle: (self) => el.classList.toggle('is-solid', self.isActive),
  });
  const bar = document.querySelector('.p-progress');
  if (bar) gsap.to(bar, { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: true } });
}

/** Split Text : titres révélés mot par mot (masque), au chargement ou au scroll. */
function splitTitles() {
  document.querySelectorAll('[data-split]').forEach((el) => {
    const split = SplitText.create(el, { type: 'lines,words', mask: 'lines', linesClass: 'split-line' });
    const hero = el.hasAttribute('data-split-now');
    gsap.from(split.words, {
      yPercent: 110,
      opacity: 0,
      duration: hero ? 1.1 : 0.9,
      ease: 'expo.out',
      stagger: hero ? 0.06 : 0.035,
      delay: hero ? 0.2 : 0,
      scrollTrigger: hero ? undefined : { trigger: el, start: 'top 85%', once: true },
    });
  });
}

/** Scroll Reveal : paragraphe qui s'éclaire mot à mot au rythme du scroll. */
function scrollReveal() {
  document.querySelectorAll('[data-reveal-words]').forEach((el) => {
    const split = SplitText.create(el, { type: 'words' });
    gsap.fromTo(
      split.words,
      { opacity: 0.16 },
      { opacity: 1, stagger: 0.08, ease: 'none', scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: true } },
    );
  });
}

function fadeUps() {
  gsap.utils.toArray('[data-up]').forEach((el) => {
    const items = el.hasAttribute('data-up-children') ? el.children : el;
    gsap.from(items, {
      y: 48,
      opacity: 0,
      duration: 1,
      ease: 'power3.out',
      stagger: 0.09,
      scrollTrigger: { trigger: el, start: 'top 86%', once: true },
    });
  });
}

/** Count Up : valeurs réelles uniquement (data-count = valeur finale). */
function countUps() {
  document.querySelectorAll('[data-count]').forEach((el) => {
    const end = parseFloat(el.dataset.count);
    const obj = { v: 0 };
    gsap.to(obj, {
      v: end,
      duration: 1.8,
      ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
      onUpdate: () => (el.textContent = Math.round(obj.v)),
    });
  });
}

/** Spotlight Card : halo qui suit le pointeur (variables CSS, pas de mise en page). */
function spotlights() {
  if (!fine) return;
  document.querySelectorAll('[data-spotlight]').forEach((card) =>
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - r.left}px`);
      card.style.setProperty('--my', `${e.clientY - r.top}px`);
    }),
  );
}

/** Magnet : bouton attiré par le pointeur. */
function magnets() {
  if (!fine || reduced) return;
  document.querySelectorAll('[data-magnet]').forEach((el) => {
    const x = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' });
    const y = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      x((e.clientX - r.left - r.width / 2) * 0.35);
      y((e.clientY - r.top - r.height / 2) * 0.35);
    });
    el.addEventListener('pointerleave', () => {
      x(0);
      y(0);
    });
  });
}

/** Scroll Velocity : bandeau infini dont la vitesse suit celle du scroll. */
function marquees(lenis) {
  document.querySelectorAll('[data-marquee]').forEach((el) => {
    const track = el.querySelector('.marquee__track');
    track.append(...[...track.children].map((n) => n.cloneNode(true)));
    if (reduced) return;
    const from = el.dataset.marquee === 'reverse' ? -50 : 0;
    const tween = gsap.fromTo(track, { xPercent: from }, { xPercent: -50 - from, duration: 38, ease: 'none', repeat: -1 });
    let boost = 1;
    gsap.ticker.add(() => {
      const v = lenis ? Math.min(Math.abs(lenis.velocity) / 6, 5) : 0;
      boost += (1 + v - boost) * 0.08;
      tween.timeScale(boost);
    });
  });
}

/** Section épinglée : les étapes défilent horizontalement (desktop), empilées sur mobile. */
function horizontal() {
  const sec = document.querySelector('[data-horizontal]');
  if (!sec || reduced) return;
  const mm = gsap.matchMedia();
  mm.add('(min-width: 900px)', () => {
    const track = sec.querySelector('.h-track');
    const dist = () => track.scrollWidth - window.innerWidth + 32;
    const fill = sec.querySelector('.h-fill');
    const tl = gsap.timeline({
      scrollTrigger: { trigger: sec, start: 'top top', end: () => `+=${dist()}`, pin: true, scrub: 0.6, invalidateOnRefresh: true },
    });
    tl.to(track, { x: () => -dist(), ease: 'none' }, 0);
    if (fill) tl.fromTo(fill, { scaleX: 0 }, { scaleX: 1, ease: 'none' }, 0);
  });
}

function parallax() {
  if (reduced) return;
  gsap.utils.toArray('[data-parallax]').forEach((el) =>
    gsap.to(el, {
      yPercent: parseFloat(el.dataset.parallax) || -20,
      ease: 'none',
      scrollTrigger: { trigger: el.closest('section') || el, start: 'top bottom', end: 'bottom top', scrub: true },
    }),
  );
}

function accordions() {
  document.querySelectorAll('.faq details').forEach((d) =>
    d.addEventListener('toggle', () => {
      if (!d.open) return;
      d.parentElement.querySelectorAll('details[open]').forEach((o) => o !== d && (o.open = false));
    }),
  );
}

/** Lance tous les effets ; retourne Lenis pour les scripts de page. */
export async function initPremium() {
  await document.fonts.ready;
  const lenis = smoothScroll();
  header();
  accordions();
  spotlights();
  magnets();
  marquees(lenis);
  if (!reduced) {
    splitTitles();
    scrollReveal();
    fadeUps();
    countUps();
    horizontal();
    parallax();
  } else {
    document.querySelectorAll('[data-count]').forEach((el) => (el.textContent = el.dataset.count));
  }
  root.classList.add('is-ready');
  ScrollTrigger.refresh();
  window.__newbox = { lenis, ScrollTrigger };
  return lenis;
}

/** Formulaire → e-mail pré-rempli (aucune donnée stockée par le site). */
export function mailtoForm(form, { to = 'info@newbox.com.tn', subject }) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const lines = [];
    form.querySelectorAll('[name]').forEach((f) => {
      if (f.type === 'checkbox' && !f.checked) return;
      const label = f.closest('label')?.querySelector('span')?.textContent?.trim() || f.name;
      const value = f.type === 'checkbox' ? f.value : data.get(f.name);
      if (value) lines.push(`${label} : ${value}`);
    });
    const subj = typeof subject === 'function' ? subject(data) : subject;
    window.location.href = `mailto:${to}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(lines.join('\n'))}`;
    const ok = form.querySelector('[data-sent]');
    if (ok) ok.hidden = false;
  });
}
