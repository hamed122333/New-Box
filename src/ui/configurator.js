import { FLUTES, FLUTE_ORDER } from '../data/flutes.js';
import { GRADES, GRADE_ORDER, CONDITIONS } from '../data/grades.js';
import { estimate, fmt } from '../lib/calc.js';
import { afterNextPaint } from '../lib/schedule.js';

const LIMITS = { L: [100, 800], W: [80, 600], H: [50, 800] };
const DEFAULTS = { L: 400, W: 300, H: 300, flute: 'C', grade: 'standard', ink: 'bleu', content: 10, condition: 'standard' };

/**
 * Configurateur façon « mockup 3D » : dimensions, cannelure, qualité, impression,
 * ouverture / mise à plat, capture PNG et demande de devis pré-remplie.
 */
export class Configurator {
  constructor(root, { onSpec, onCapture }) {
    this.root = root;
    this.onSpec = onSpec;
    this.onCapture = onCapture;
    this.spec = { ...DEFAULTS, logo: null };
    this.view = { lid: 0, flat: 0, angle: -0.5, autoRotate: true, shiftX: 0, shiftY: 0, fracW: 0.55, fracH: 0.9 };
    this.viewer = root.querySelector('[data-viewer]');
    this._pending = null;
    this._renderOptions();
    this._bind();
    this._refreshOutputs();
  }

  _renderOptions() {
    const flutes = this.root.querySelector('[data-options="flute"]');
    flutes.innerHTML = FLUTE_ORDER.map(
      (id) =>
        `<button type="button" class="seg__btn" data-flute="${id}" aria-pressed="${id === this.spec.flute}">
           <strong>${id}</strong><span>${FLUTES[id].thickness.toString().replace('.', ',')} mm</span>
         </button>`,
    ).join('');
    const grade = this.root.querySelector('select[name="grade"]');
    grade.innerHTML = GRADE_ORDER.map((id) => `<option value="${id}">${GRADES[id].name} — ${GRADES[id].desc}</option>`).join('');
    grade.value = this.spec.grade;
    const cond = this.root.querySelector('select[name="condition"]');
    cond.innerHTML = Object.values(CONDITIONS)
      .map((c) => `<option value="${c.id}">${c.name}</option>`)
      .join('');
    cond.value = this.spec.condition;
  }

  _bind() {
    const $ = (s) => this.root.querySelector(s);

    // Dimensions : curseur + champ numérique synchronisés
    for (const k of ['L', 'W', 'H']) {
      const range = $(`input[type=range][name=${k}]`);
      const num = $(`input[type=number][name=${k}]`);
      range.min = num.min = LIMITS[k][0];
      range.max = num.max = LIMITS[k][1];
      range.value = num.value = this.spec[k];
      const commit = (v, from, mode) => {
        const val = Math.round(Math.min(LIMITS[k][1], Math.max(LIMITS[k][0], Number(v) || this.spec[k])));
        if (from !== range) range.value = val;
        if (from !== num) num.value = val;
        this._set({ [k]: val }, mode);
      };
      // pendant le glissement : géométrie seule ; au relâchement : textures (cotes imprimées)
      range.addEventListener('input', () => commit(range.value, range, 'drag'));
      range.addEventListener('change', () => commit(range.value, range, 'full'));
      num.addEventListener('change', () => commit(num.value, num, 'full'));
    }

    $('[data-options="flute"]').addEventListener('click', (e) => {
      const b = e.target.closest('[data-flute]');
      if (!b) return;
      this.root.querySelectorAll('[data-flute]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      this._set({ flute: b.dataset.flute });
    });
    $('select[name="grade"]').addEventListener('change', (e) => this._set({ grade: e.target.value }));
    $('select[name="condition"]').addEventListener('change', (e) => this._set({ condition: e.target.value }, 'calc'));
    $('input[name="content"]').addEventListener('input', (e) => {
      $('[data-out="content"]').textContent = `${fmt(e.target.value)} kg`;
      this._set({ content: Number(e.target.value) }, 'calc');
    });

    this.root.querySelectorAll('input[name="ink"]').forEach((r) =>
      r.addEventListener('change', () => r.checked && this._set({ ink: r.value })),
    );

    const file = $('input[name="logo"]');
    file.addEventListener('change', () => {
      const f = file.files?.[0];
      if (!f) return;
      const url = URL.createObjectURL(f);
      const img = new Image();
      img.onload = () => {
        this._set({ logo: img });
        $('[data-logo-name]').textContent = f.name;
        this.root.classList.add('has-logo');
      };
      img.src = url;
    });
    $('[data-action="remove-logo"]').addEventListener('click', () => {
      file.value = '';
      $('[data-logo-name]').textContent = 'Aucun fichier';
      this.root.classList.remove('has-logo');
      this._set({ logo: null });
    });

    const lid = $('input[name="lid"]');
    lid.addEventListener('input', () => (this.view.lid = Number(lid.value)));
    const flat = $('input[name="flat"]');
    flat.addEventListener('input', () => (this.view.flat = Number(flat.value)));
    const auto = $('input[name="autorotate"]');
    auto.checked = this.view.autoRotate;
    auto.addEventListener('change', () => (this.view.autoRotate = auto.checked));

    // Capture : bouton mis à jour tout de suite, rendu + encodage PNG (asynchrone) ensuite
    const capBtn = $('[data-action="capture"]');
    capBtn.addEventListener('click', () => {
      if (capBtn.disabled) return;
      const label = capBtn.textContent;
      capBtn.disabled = true;
      capBtn.textContent = 'Capture…';
      afterNextPaint(async () => {
        try {
          const blob = await this.onCapture();
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `newbox-${this.spec.L}x${this.spec.W}x${this.spec.H}-${this.spec.flute}.png`;
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 5000);
        } finally {
          capBtn.disabled = false;
          capBtn.textContent = label;
        }
      });
    });
    $('[data-action="reset"]').addEventListener('click', () => this.reset());
    $('[data-action="quote"]').addEventListener('click', () => {
      window.location.href = this.mailto();
    });
  }

  /**
   * Mise à jour de la spécification.
   *  - 'full' : reconstruction complète (géométrie + textures imprimées) ;
   *  - 'drag' : géométrie seule pendant un glissement, textures refaites au relâchement ;
   *  - 'calc' : estimations seules, la 3D ne change pas.
   * Les chiffres sont mis à jour immédiatement ; la 3D est reconstruite après l'image suivante
   * et les rafales d'événements sont regroupées en une seule reconstruction.
   */
  _set(patch, mode = 'full') {
    Object.assign(this.spec, patch);
    this._refreshOutputs();
    if (mode === 'calc') return;
    this._pending = { ...(this._pending || {}), ...patch };
    if (mode === 'full') this._pendingFull = true;
    if (this._scheduled) return;
    this._scheduled = true;
    afterNextPaint(() => {
      this._scheduled = false;
      const patch = this._pending;
      const full = this._pendingFull;
      this._pending = null;
      this._pendingFull = false;
      this.onSpec(patch, { deferTextures: !full });
    });
  }

  reset() {
    const $ = (s) => this.root.querySelector(s);
    for (const k of ['L', 'W', 'H']) {
      $(`input[type=range][name=${k}]`).value = DEFAULTS[k];
      $(`input[type=number][name=${k}]`).value = DEFAULTS[k];
    }
    this.root.querySelectorAll('[data-flute]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.flute === DEFAULTS.flute)));
    $('select[name="grade"]').value = DEFAULTS.grade;
    $('select[name="condition"]').value = DEFAULTS.condition;
    $('input[name="content"]').value = DEFAULTS.content;
    $('[data-out="content"]').textContent = `${DEFAULTS.content} kg`;
    this.root.querySelector(`input[name="ink"][value="${DEFAULTS.ink}"]`).checked = true;
    $('input[name="lid"]').value = 0;
    $('input[name="flat"]').value = 0;
    $('input[name="logo"]').value = '';
    $('[data-logo-name]').textContent = 'Aucun fichier';
    this.root.classList.remove('has-logo');
    Object.assign(this.view, { lid: 0, flat: 0 });
    this._set({ ...DEFAULTS, logo: null });
  }

  _refreshOutputs() {
    const e = estimate(this.spec);
    this.result = e;
    const out = (k, v) => {
      const el = this.root.querySelector(`[data-out="${k}"]`);
      if (el) el.textContent = v;
    };
    out('ect', `${fmt(e.ect, 1)} kN/m`);
    out('bct', `${fmt(e.bctKg)} kgf`);
    out('grammage', `${fmt(e.grammage)} g/m²`);
    out('weight', `${fmt(e.boxWeightG)} g`);
    out('burst', `${fmt(e.burst)} kPa`);
    out('maxload', `${fmt(e.maxLoadKg)} kg`);
    out('stack', `${e.stack} caisse${e.stack > 1 ? 's' : ''}`);
    out('stack-note', e.stack > e.palletLayers ? `limité à ${e.palletLayers} niveaux par la hauteur palette (1,8 m)` : `coefficient de sécurité ×${fmt(e.factor, 1)}`);
    out('summary', `${this.spec.L} × ${this.spec.W} × ${this.spec.H} mm · ${FLUTES[this.spec.flute].name} · ${GRADES[this.spec.grade].name}`);
    const gauge = this.root.querySelector('[data-gauge]');
    if (gauge) gauge.style.setProperty('--p', Math.min(1, e.bctKg / 900).toFixed(3));
  }

  mailto() {
    const s = this.spec;
    const e = this.result;
    const body = [
      'Bonjour New Box,',
      '',
      'Je souhaite recevoir un devis pour la caisse suivante :',
      `• Modèle : caisse américaine FEFCO 0201`,
      `• Dimensions intérieures : ${s.L} × ${s.W} × ${s.H} mm`,
      `• Cannelure : ${FLUTES[s.flute].name} (${FLUTES[s.flute].thickness} mm)`,
      `• Qualité papier : ${GRADES[s.grade].name} — ${GRADES[s.grade].desc}`,
      `• Impression : ${s.logo ? 'logo client (fichier à joindre)' : 'à définir'} — encre ${s.ink === 'bleu' ? 'bleu New Box' : s.ink}`,
      `• Poids du contenu : ${s.content} kg — stockage : ${CONDITIONS[s.condition].name}`,
      '',
      `Estimations du configurateur : ECT ≈ ${fmt(e.ect, 1)} kN/m, BCT ≈ ${fmt(e.bctKg)} kgf, poids caisse ≈ ${fmt(e.boxWeightG)} g.`,
      '',
      'Quantité souhaitée : ',
      'Société / contact : ',
    ].join('\n');
    const subject = `Demande de devis — caisse ${s.L}×${s.W}×${s.H} ${s.flute}`;
    return `mailto:info@newbox.com.tn?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  /** Aligne le centre du rendu 3D sur la zone « viewer » de la section. */
  measure(size) {
    const r = this.viewer.getBoundingClientRect();
    this.view.shiftX = (r.left + r.width / 2) / size.w - 0.5;
    this.view.shiftY = (r.top + r.height / 2) / size.h - 0.5;
    this.view.fracW = r.width / size.w;
    this.view.fracH = Math.min(r.height, size.h) / size.h;
  }
}
