import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * État unique piloté par le scroll. Chaque propriété est une valeur continue :
 * la scène 3D lit cet objet à chaque image (aucune animation « cachée »),
 * ce qui rend le récit réversible et facile à régler.
 */
export const state = {
  world: 0, // 0 = caisse, 1 = macro
  fade: 0, // voile de transition entre les mondes
  camBox: 0, // index flottant des plans caméra « caisse »
  camMacro: 0, // index flottant des plans caméra « macro »
  shiftX: 0.18, // décalage horizontal du rendu (fraction d'écran)
  idle: 1, // balancement de la caisse en ouverture
  rotY: -0.22,
  lid: 0, // 0 fermé → 1 ouvert
  flat: 0, // 0 monté → 1 à plat (flan)
  tape: 1,
  explode: 0, // éclaté des papiers
  labels: 0,
  flute: 0, // index flottant dans FLUTE_STORY
  ect: 0, // test de compression sur chant
  stack: 0, // palettisation
};

/**
 * Construit la timeline maître. Les chapitres (.chapter[data-units]) sont des
 * espaceurs de hauteur `units × 100vh` : 1 unité de timeline = 1 écran de scroll.
 */
export function buildStory({ reduced }) {
  const chapters = [...document.querySelectorAll('#story .chapter')];
  const S = {};
  const ranges = [];
  let t = 0;
  for (const el of chapters) {
    const u = parseFloat(el.dataset.units || '1');
    el.style.setProperty('--units', u);
    S[el.id] = t;
    ranges.push({ id: el.id, el, start: t, end: t + u });
    t += u;
  }
  const total = t;

  const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
  const to = (vars, at) => tl.to(state, vars, at);

  // 01 — Ouverture
  to({ idle: 0, rotY: 0, duration: 0.7, ease: 'power1.inOut' }, S.ouverture - 0.4);
  to({ camBox: 1, duration: 1.1 }, S.ouverture - 0.3);
  to({ lid: 1, duration: 0.9, ease: 'power1.inOut' }, S.ouverture + 0.1);

  // 02 — Plongée dans la tranche puis bascule vers le monde macro
  to({ camBox: 2, duration: 0.6, ease: 'power1.in' }, S.plongee);
  to({ shiftX: 0, duration: 0.5 }, S.plongee);
  to({ fade: 1, duration: 0.2, ease: 'power1.in' }, S.plongee + 0.42);
  to({ world: 1, duration: 0.01 }, S.plongee + 0.62);
  to({ fade: 0, duration: 0.25, ease: 'power1.out' }, S.plongee + 0.64);
  to({ camMacro: 0.15, duration: 0.35 }, S.plongee + 0.65);

  // 03 — Anatomie : éclaté + étiquettes
  to({ camMacro: 1, duration: 0.7, ease: 'power1.inOut' }, S.anatomie - 0.05);
  to({ shiftX: 0.14, duration: 0.5 }, S.anatomie);
  to({ explode: 1, duration: 0.5, ease: 'power2.inOut' }, S.anatomie + 0.15);
  to({ labels: 1, duration: 0.25 }, S.anatomie + 0.55);
  to({ labels: 0, duration: 0.2 }, S.anatomie + 1.2);
  to({ explode: 0, duration: 0.4, ease: 'power2.inOut' }, S.anatomie + 1.25);

  // 04 — Cannelures : C → F → E → B → C → BC (FLUTE_STORY)
  to({ camMacro: 2, duration: 0.6, ease: 'power1.inOut' }, S.cannelures - 0.1);
  to({ shiftX: 0.2, duration: 0.4 }, S.cannelures);
  [0.12, 0.5, 0.88, 1.26, 1.64].forEach((at, i) => to({ flute: i + 1, duration: 0.3, ease: 'power2.inOut' }, S.cannelures + at));

  // 05 — Qualité : test ECT
  to({ camMacro: 3, duration: 0.7, ease: 'power1.inOut' }, S.qualite - 0.1);
  to({ shiftX: 0.16, duration: 0.4 }, S.qualite);
  to({ ect: 1, duration: 1.1 }, S.qualite + 0.1);

  // 06 — Fabrication : retour au monde caisse, flan à plat qui se plie
  to({ fade: 1, duration: 0.2, ease: 'power1.in' }, S.fabrication - 0.2);
  to({ flat: 1, tape: 0, camBox: 3, shiftX: 0.2, duration: 0.01 }, S.fabrication - 0.01);
  to({ world: 0, duration: 0.01 }, S.fabrication);
  to({ fade: 0, duration: 0.25, ease: 'power1.out' }, S.fabrication + 0.02);
  to({ flat: 0, duration: 1.0, ease: 'power1.inOut' }, S.fabrication + 0.35);
  to({ camBox: 4, duration: 1.0 }, S.fabrication + 0.35);
  to({ lid: 0, duration: 0.4, ease: 'power1.inOut' }, S.fabrication + 1.35);

  // 07 — Palettisation
  to({ tape: 1, duration: 0.2 }, S.palette - 0.05);
  to({ camBox: 5, duration: 0.9, ease: 'power1.inOut' }, S.palette);
  to({ shiftX: 0.18, duration: 0.4 }, S.palette);
  to({ stack: 1, duration: 1.3 }, S.palette + 0.05);

  // 08 — Engagement
  to({ camBox: 6, duration: 1 }, S.engagement);
  to({ shiftX: 0.12, duration: 0.5 }, S.engagement);

  tl.set({}, {}, total);

  const trigger = ScrollTrigger.create({
    trigger: '#story',
    start: 'top top',
    end: 'bottom top',
    scrub: reduced ? true : 0.9,
    animation: tl,
    invalidateOnRefresh: true,
  });

  /** Chapitre actif selon le temps de la timeline (avec un peu d'avance). */
  const activeAt = (time) => {
    for (let i = ranges.length - 1; i >= 0; i--) if (time >= ranges[i].start - 0.35) return ranges[i];
    return ranges[0];
  };

  return { tl, trigger, ranges, total, activeAt, starts: S };
}
