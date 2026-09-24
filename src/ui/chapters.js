import { FLUTES, FLUTE_STORY } from '../data/flutes.js';
import { boardComposition, estimate, fmt } from '../lib/calc.js';
import { smooth } from '../three/box.js';

/**
 * Tout ce qui, dans le DOM, dépend du temps du récit :
 * chapitre actif, fiche cannelure, compteurs qualité, étapes de fabrication, rail.
 */
export class ChapterUI {
  constructor(story) {
    this.story = story;
    this.active = null;
    this.rail = [...document.querySelectorAll('.rail__item')];
    this.fluteCard = document.querySelector('[data-flute-card]');
    this.fluteTabs = [...document.querySelectorAll('[data-flute-tab]')];
    this.counters = [...document.querySelectorAll('[data-counter]')];
    this.steps = [...document.querySelectorAll('[data-step]')];
    this._flute = null;
    this._step = -1;

    // Valeurs du test qualité : double cannelure BC, qualité standard, caisse 400 × 300 × 300
    const q = estimate({ L: 400, W: 300, H: 300, flute: 'BC', grade: 'standard', content: 10, condition: 'standard' });
    this.quality = { ect: q.ect, bct: q.bctKg, burst: q.burst, cobb: q.cobb };
  }

  update(time, st, inStory) {
    const r = inStory ? this.story.activeAt(time) : null;
    const id = r?.id ?? null;
    if (id !== this.active) {
      this.active = id;
      document.querySelectorAll('#story .chapter').forEach((el) => el.classList.toggle('is-active', el.id === id));
      this.rail.forEach((el) => el.classList.toggle('is-active', el.dataset.target === id));
    }
    document.documentElement.dataset.world = st.world > 0.5 ? 'macro' : 'box';
    document.documentElement.style.setProperty('--fade', st.fade.toFixed(3));

    if (id === 'cannelures' || id === 'anatomie') this._updateFlute(st.flute);
    if (id === 'qualite') this._updateCounters(st.ect);
    if (id === 'fabrication' && r) this._updateSteps((time - r.start) / (r.end - r.start));
  }

  _updateFlute(f) {
    const idx = Math.round(Math.min(FLUTE_STORY.length - 1, Math.max(0, f)));
    const id = FLUTE_STORY[idx];
    if (id === this._flute || !this.fluteCard) return;
    this._flute = id;
    const fl = FLUTES[id];
    const comp = boardComposition(id, 'standard');
    const set = (k, v) => {
      const el = this.fluteCard.querySelector(`[data-f="${k}"]`);
      if (el) el.textContent = v;
    };
    set('name', fl.name);
    set('family', fl.family);
    set('thickness', `${fmt(fl.thickness, 1)} mm`);
    set('pitch', fl.layers.map((l) => fmt(l.pitch, 1)).join(' + ') + ' mm');
    set('height', fl.layers.map((l) => fmt(l.height, 1)).join(' + ') + ' mm');
    set('takeup', fl.layers.map((l) => fmt(l.takeUp, 2)).join(' / '));
    set('grammage', `≈ ${fmt(comp.grammage)} g/m²`);
    set('ect', `≈ ${fmt(comp.ect, 1)} kN/m`);
    set('usage', fl.usage);
    this.fluteCard.style.setProperty('--thick', (fl.thickness / 7).toFixed(3));
    this.fluteCard.classList.remove('is-swap');
    void this.fluteCard.offsetWidth;
    this.fluteCard.classList.add('is-swap');
    this.fluteTabs.forEach((t) => t.classList.toggle('is-active', t.dataset.fluteTab === id));
  }

  _updateCounters(p) {
    const k = smooth(0.35, 0.95, p);
    for (const el of this.counters) {
      const key = el.dataset.counter;
      const v = this.quality[key] * k;
      el.textContent = fmt(v, key === 'ect' ? 1 : 0);
    }
  }

  _updateSteps(p) {
    const i = Math.min(this.steps.length - 1, Math.max(0, Math.floor(p * this.steps.length * 0.999)));
    if (i === this._step) return;
    this._step = i;
    this.steps.forEach((el, j) => {
      el.classList.toggle('is-active', j === i);
      el.classList.toggle('is-done', j < i);
    });
  }
}
