import { FLUTES, FLUTE_ORDER } from '../data/flutes.js';
import { PAPERS, OUTER_ORDER, INNER_ORDER, FLUTING, CONDITIONS } from '../data/papers.js';
import { PRODUCTS, PRODUCT_ORDER, flutesFor } from '../data/products.js';
import { estimate, fmt } from '../lib/calc.js';
import { afterNextPaint } from '../lib/schedule.js';

// Dimensions (mm) : caisse / découpe = dimensions intérieures L × l × H ; plaque = format L × l
const LIMITS = {
  caisse: { L: [100, 800], W: [80, 600], H: [50, 800] },
  decoupe: { L: [100, 800], W: [80, 600], H: [50, 800] },
  plaque: { L: [300, 2400], W: [200, 1600], H: [50, 800] },
};
const LEGENDS = { caisse: 'Dimensions intérieures', decoupe: 'Dimensions de la boîte', plaque: 'Format de la plaque' };
const UNITS = { caisse: ['caisse', 'caisses'], decoupe: ['découpe', 'découpes'], plaque: ['plaque', 'plaques'] };
const WEIGHT_LABEL = { caisse: 'Poids de la caisse', decoupe: 'Poids du flan', plaque: 'Poids de la plaque' };
const DEFAULTS = { product: 'CI', L: 400, W: 300, H: 300, flute: 'C', outer: 'KL', inner: 'TL', ink: 'bleu', content: 10, condition: 'standard' };
const INK_NAMES = { bleu: 'bleu New Box', noir: 'noir', rouge: 'rouge', vert: 'vert' };

const clamp = (v, [a, b]) => Math.round(Math.min(b, Math.max(a, v)));

/**
 * Configurateur façon « mockup 3D » : produit (codes usine et délais), dimensions, cannelure,
 * papiers, impression, ouverture / mise à plat, capture PNG et demande de devis pré-remplie.
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
    this._syncUI();
    this._refreshOutputs();
  }

  get product() {
    return PRODUCTS[this.spec.product];
  }

  _renderOptions() {
    const $ = (s) => this.root.querySelector(s);
    $('[data-options="product"]').innerHTML = PRODUCT_ORDER.map((code) => {
      const p = PRODUCTS[code];
      return `<button type="button" class="prod__btn" data-product="${code}" aria-pressed="false" title="${p.name}">
          <strong>${code}</strong><span>${p.short}</span>
        </button>`;
    }).join('');
    $('[data-options="flute"]').innerHTML = FLUTE_ORDER.map(
      (id) =>
        `<button type="button" class="seg__btn" data-flute="${id}" aria-pressed="false">
           <strong>${id}</strong><span>${FLUTES[id].thickness.toString().replace('.', ',')} mm</span>
         </button>`,
    ).join('');
    const opt = (code) => `<option value="${code}">${code} — ${PAPERS[code].name} (${PAPERS[code].gsm} g/m²)</option>`;
    $('select[name="outer"]').innerHTML = OUTER_ORDER.map(opt).join('');
    $('select[name="inner"]').innerHTML = INNER_ORDER.map(opt).join('');
    $('[data-out="fluting"]').textContent = `${FLUTING} — ${PAPERS[FLUTING].name} (${PAPERS[FLUTING].gsm} g/m²)`;
    $('select[name="condition"]').innerHTML = Object.values(CONDITIONS)
      .map((c) => `<option value="${c.id}">${c.name}</option>`)
      .join('');
  }

  _bind() {
    const $ = (s) => this.root.querySelector(s);

    $('[data-options="product"]').addEventListener('click', (e) => {
      const b = e.target.closest('[data-product]');
      if (b) this.selectProduct(b.dataset.product);
    });

    // Dimensions : curseur + champ numérique synchronisés
    for (const k of ['L', 'W', 'H']) {
      const range = $(`input[type=range][name=${k}]`);
      const num = $(`input[type=number][name=${k}]`);
      const commit = (v, from, mode) => {
        const val = clamp(Number(v) || this.spec[k], LIMITS[this.product.family][k]);
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
      if (!b || b.disabled) return;
      this._set({ flute: b.dataset.flute });
      this._syncUI();
    });
    $('select[name="outer"]').addEventListener('change', (e) => this._set({ outer: e.target.value }));
    $('select[name="inner"]').addEventListener('change', (e) => this._set({ inner: e.target.value }));
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
          a.download = `newbox-${this.spec.product}-${this._dimsText('x')}-${this.spec.flute}.png`;
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

  /** Change de produit : cannelures autorisées et bornes des dimensions suivent. */
  selectProduct(code) {
    const p = PRODUCTS[code];
    const patch = { product: code };
    if (!flutesFor(p).includes(this.spec.flute)) patch.flute = p.walls === 2 ? 'BC' : 'C';
    for (const k of ['L', 'W', 'H']) {
      const v = clamp(this.spec[k], LIMITS[p.family][k]);
      if (v !== this.spec[k]) patch[k] = v;
    }
    this._set(patch);
    this._syncUI();
  }

  /** Reflète la spécification dans l'interface (boutons, bornes, sections visibles). */
  _syncUI() {
    const $ = (s) => this.root.querySelector(s);
    const p = this.product;
    this.root.dataset.family = p.family;
    this.root.dataset.printed = String(p.printed);
    this.root.querySelectorAll('[data-product]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.product === p.code)));
    const allowed = flutesFor(p);
    this.root.querySelectorAll('[data-flute]').forEach((b) => {
      b.disabled = !allowed.includes(b.dataset.flute);
      b.setAttribute('aria-pressed', String(b.dataset.flute === this.spec.flute));
    });
    $('[data-dims-legend]').textContent = LEGENDS[p.family];
    for (const k of ['L', 'W', 'H']) {
      const [min, max] = LIMITS[p.family][k];
      for (const el of this.root.querySelectorAll(`input[name=${k}]`)) {
        el.min = min;
        el.max = max;
        el.value = this.spec[k];
      }
    }
    $('select[name="outer"]').value = this.spec.outer;
    $('select[name="inner"]').value = this.spec.inner;
    $('select[name="condition"]').value = this.spec.condition;
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
      const pending = this._pending;
      const full = this._pendingFull;
      this._pending = null;
      this._pendingFull = false;
      this.onSpec(pending, { deferTextures: !full });
    });
  }

  reset() {
    const $ = (s) => this.root.querySelector(s);
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
    this._syncUI();
  }

  _dimsText(sep = ' × ') {
    const s = this.spec;
    return this.product.family === 'plaque' ? `${s.L}${sep}${s.W}` : `${s.L}${sep}${s.W}${sep}${s.H}`;
  }

  _refreshOutputs() {
    const e = estimate(this.spec);
    const p = this.product;
    this.result = e;
    const out = (k, v) => {
      const el = this.root.querySelector(`[data-out="${k}"]`);
      if (el && el.textContent !== v) el.textContent = v;
    };
    out('product-name', `${p.code} — ${p.name}`);
    out('lead', e.lead);
    out('ect', `${fmt(e.ect, 1)} kN/m`);
    out('grammage', `${fmt(e.grammage)} g/m²`);
    out('papers', e.papers);
    out('weight-label', WEIGHT_LABEL[p.family]);
    out('weight', `${fmt(e.weightG)} g`);
    out('burst', `${fmt(e.burst)} kPa`);
    const [one, many] = UNITS[p.family];
    const n = e.pallet.perPallet;
    out('pallet', `≈ ${fmt(n)} ${n > 1 ? many : one} à plat`);
    out('pallet-note', `${e.pallet.perLayer} paquet${e.pallet.perLayer > 1 ? 's' : ''} × ${fmt(e.pallet.perPile)} · palette 1200 × 800, 1,10 m de charge`);
    if (e.isCase) {
      out('bct', `${fmt(e.bctKg)} kgf`);
      out('maxload', `${fmt(e.maxLoadKg)} kg`);
      out('stack', `${e.stack} caisse${e.stack > 1 ? 's' : ''}`);
      out('stack-note', e.stack > e.palletLayers ? `limité à ${e.palletLayers} niveaux par la hauteur palette (1,8 m)` : `coefficient de sécurité ×${fmt(e.factor, 1)}`);
      const gauge = this.root.querySelector('[data-gauge]');
      if (gauge) gauge.style.setProperty('--p', Math.min(1, e.bctKg / 900).toFixed(3));
    }
    out('summary', `${p.code} · ${this._dimsText()} mm · ${FLUTES[this.spec.flute].name} · ${e.papers} · ${e.lead}`);
  }

  mailto() {
    const s = this.spec;
    const e = this.result;
    const p = this.product;
    const dims = p.family === 'plaque' ? `Format : ${this._dimsText()} mm` : `Dimensions intérieures : ${this._dimsText()} mm`;
    const lines = [
      'Bonjour New Box,',
      '',
      'Je souhaite recevoir un devis pour :',
      `• Produit : ${p.code} — ${p.name}${p.family === 'caisse' ? ' (caisse américaine FEFCO 0201)' : ''}`,
      `• ${dims}`,
      `• Cannelure : ${FLUTES[s.flute].name} (${FLUTES[s.flute].thickness} mm)`,
      `• Papiers : ${e.papers}`,
    ];
    if (p.printed) lines.push(`• Impression : ${s.logo ? 'logo client (fichier à joindre)' : 'à définir'} — encre ${INK_NAMES[s.ink] ?? s.ink}`);
    if (e.isCase) lines.push(`• Poids du contenu : ${s.content} kg — stockage : ${CONDITIONS[s.condition].name}`);
    lines.push(
      '',
      `Délai de fabrication indicatif : ${e.lead}.`,
      `Estimations du configurateur : ECT ≈ ${fmt(e.ect, 1)} kN/m${e.isCase ? `, BCT ≈ ${fmt(e.bctKg)} kgf` : ''}, ${WEIGHT_LABEL[p.family].toLowerCase()} ≈ ${fmt(e.weightG)} g.`,
      '',
      'Quantité souhaitée : ',
      'Société / contact : ',
    );
    const subject = `Demande de devis — ${p.code} ${this._dimsText('×')} ${s.flute}`;
    return `mailto:info@newbox.com.tn?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
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
