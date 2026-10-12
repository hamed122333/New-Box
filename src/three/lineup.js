import * as THREE from 'three';
import { DieCutModel } from './models.js';
import { STYLES } from '../data/styles.js';
import { smooth } from './box.js';

// Disposition du chapitre « La gamme » (1 unité = 100 mm) : une rangée que la caméra parcourt
// de gauche à droite ; les couvercles s'ouvrent vers l'arrière, où rien n'est masqué.
const ITEMS = [
  { id: 'pizza', product: 'DI', x: -3.9, z: 0.8, rotY: 0.1, open: [0, 0.6] },
  { id: 'mailer', product: 'DI', x: 0.4, z: -0.3, rotY: -0.12, open: [0.4, 1] },
  { id: 'tray', product: 'DI', x: 5.1, z: 0.6, rotY: -0.14 },
  { id: 'divider', product: 'DV', x: 9.7, z: -0.5, rotY: 0.18 },
];
const BOX_SLOT = { x: -8.5, z: -0.6, rotY: 0.24 };

/**
 * Les autres produits New Box présentés ensemble : boîte pizza, boîte e-commerce, plateau
 * fruits & légumes, croisillons (+ la caisse du récit, placée dans `boxSlot`).
 */
export class Lineup {
  constructor(renderer) {
    this.group = new THREE.Group();
    this.group.name = 'lineup';
    this.group.visible = false;
    this.items = ITEMS.map((it) => {
      const model = new DieCutModel(renderer);
      model.group.position.set(it.x, 0, it.z);
      model.group.rotation.y = it.rotY;
      this.group.add(model.group);
      return { ...it, model };
    });
    this.byId = Object.fromEntries(this.items.map((it) => [it.id, it]));
    this.boxSlot = { pos: new THREE.Vector3(BOX_SLOT.x, 0, BOX_SLOT.z), rotY: BOX_SLOT.rotY };
    this._v = new THREE.Vector3();
  }

  build(common = {}) {
    for (const it of this.items) {
      const st = STYLES[it.id];
      it.model.build({ style: it.id, product: it.product, ...st.dims, flute: st.flute, ...common });
    }
    return this;
  }

  /**
   * @param {{open:number, fill:number, build:number}} p  ouverture des couvercles, remplissage
   *   du plateau, assemblage des croisillons (0 → 1)
   */
  update({ open = 1, fill = 1, build = 1 } = {}) {
    for (const it of this.items) {
      const m = it.model;
      if (it.open) m.params.lid = smooth(it.open[0], it.open[1], open);
      if (it.id === 'tray') m.params.fill = fill;
      if (it.id === 'divider') m.params.lid = 1 - build;
      m.params.flat = 0;
      m.update();
    }
  }

  /** Point d'accroche (monde) au-dessus d'un produit, pour son étiquette. */
  anchor(id, out) {
    const m = this.byId[id].model;
    // boîtes à couvercle : devant le couvercle ouvert ; sinon au-dessus du produit
    if (id === 'pizza' || id === 'mailer') out.set(0, m.H + 0.3, m.W * 0.45);
    else out.set(0, m.H * (id === 'divider' ? 1 : 1.1) + 0.35, 0);
    return m.group.localToWorld(out);
  }
}
