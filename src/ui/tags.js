import * as THREE from 'three';

/**
 * Étiquettes des produits du chapitre « La gamme » : nom, codes usine, délai.
 * Elles suivent les modèles à l'écran et ouvrent le configurateur sur le modèle choisi.
 */
export class Tags {
  constructor(container, { lineup, box, camera }) {
    this.container = container;
    this.lineup = lineup;
    this.box = box;
    this.camera = camera;
    this.items = [...container.querySelectorAll('[data-tag]')].map((el, i) => ({ el, id: el.dataset.tag, order: i, x: '', o: '' }));
    this.v = new THREE.Vector3();
  }

  _anchor(id, out) {
    if (id !== 'caisse') return this.lineup.anchor(id, out);
    const b = this.box;
    return out.set(b.group.position.x, b.H + 0.45, b.group.position.z);
  }

  update(visibility, size) {
    const on = visibility > 0.001;
    if (on !== this._on) {
      this._on = on;
      this.container.style.visibility = on ? 'visible' : 'hidden';
      this.container.classList.toggle('is-on', on);
    }
    if (!on) return;
    const { w, h } = size;
    for (const it of this.items) {
      this._anchor(it.id, this.v).project(this.camera);
      const x = (this.v.x * 0.5 + 0.5) * w;
      const y = (-this.v.y * 0.5 + 0.5) * h;
      // n'écrire que si la valeur change (le style de chaque étiquette est invalidé sinon)
      const t = `translate3d(${x.toFixed(0)}px, ${y.toFixed(0)}px, 0)`;
      if (t !== it.x) it.el.style.transform = it.x = t;
      // hors champ (ou derrière la caméra) : masquée
      const inView = this.v.z < 1 && x > 40 && x < w - 40 && y > 70 && y < h - 20;
      const o = inView ? Math.min(1, Math.max(0, visibility * 1.8 - it.order * 0.16)).toFixed(2) : '0.00';
      if (o !== it.o) {
        it.el.style.opacity = it.o = o;
        // une étiquette invisible ne doit pas intercepter les clics
        it.el.style.visibility = o === '0.00' ? 'hidden' : '';
      }
    }
  }
}
