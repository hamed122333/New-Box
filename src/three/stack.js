import * as THREE from 'three';
import { smooth, MM } from './box.js';
import { woodTexture, paperTile, edgeTexture, layersTexture, flatCaseTexture } from './textures.js';
import { flatFormat } from '../lib/calc.js';

// Palette Europe 1200 × 800 × 144 mm
const PL = 12;
const PW = 8;
const PH = 1.44;
const LOAD = 11; // hauteur de chargement : 1,10 m

export class PalletStack {
  constructor(renderer) {
    this.aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    this.group = new THREE.Group();
    this.group.name = 'pallet-stack';
    this.pallet = this._buildPallet();
    this.group.add(this.pallet);
    this.piles = [];
    this._owned = []; // géométries / matériaux / textures à libérer à la reconstruction
    this.strapMat = new THREE.MeshStandardMaterial({ color: 0x14259b, roughness: 0.45 }); // feuillard bleu New Box
  }

  _buildPallet() {
    const g = new THREE.Group();
    const wood = new THREE.MeshStandardMaterial({ map: woodTexture(this.aniso), roughness: 0.85 });
    const add = (w, h, d, x, y, z, rotate = false) => {
      const geo = new THREE.BoxGeometry(w, h, d);
      const m = new THREE.Mesh(geo, wood);
      m.position.set(x, y + h / 2, z);
      if (rotate) m.rotation.y = Math.PI / 2;
      m.castShadow = m.receiveShadow = true;
      g.add(m);
    };
    // semelles
    for (const z of [-3.27, 0, 3.27]) add(PL, 0.22, 1.45, 0, 0, z);
    // dés
    for (const x of [-5.27, 0, 5.27]) for (const z of [-3.27, 0, 3.27]) add(1.45, 0.78, 1.45, x, 0.22, z);
    // traverses
    for (const x of [-5.27, 0, 5.27]) add(1.45, 0.22, PW, x, 1.0, 0);
    // planches de dessus
    const boards = [-3.275, -1.64, 0, 1.64, 3.275];
    boards.forEach((z, i) => add(PL, 0.22, i % 2 ? 1.0 : 1.45, 0, 1.22, z));
    return g;
  }

  /**
   * Plan de palettisation : les caisses sont livrées pliées-collées À PLAT, en paquets
   * cerclés. Tranches cannelées sur les côtés, face imprimée sur le dessus.
   */
  build(box) {
    this._owned.forEach((o) => o.dispose());
    this._owned = [];
    this.piles.forEach((p) => this.group.remove(p));
    this.piles = [];

    const s = box.spec;
    const t = box.comp.thickness * MM; // une épaisseur de carton
    const fmt = flatFormat('caisse', s, box.comp.thickness); // mm : a = L + W, b = H + W
    const a = fmt.a * MM;
    const b = fmt.b * MM;
    const fit = (x, z) => Math.floor((PL + 0.05) / x) * Math.floor((PW + 0.05) / z);
    const rotated = fit(b, a) > fit(a, b);
    const sx = rotated ? b : a; // encombrement du paquet en x
    const sz = rotated ? a : b; // … et en z
    const nx = Math.max(1, Math.floor((PL + 0.05) / sx));
    const nz = Math.max(1, Math.floor((PW + 0.05) / sz));
    const perCase = fmt.thick * MM; // caisse à plat = 2 épaisseurs
    const count = Math.floor(LOAD / perCase);
    const pileH = count * perCase;
    this.layout = { nx, nz, count, perPallet: nx * nz * count, rotated };

    // Matériaux : dessus imprimé (face + côté côte à côte), tranches ondulées / en couches
    const own = (x) => (this._owned.push(x), x);
    const palette = box.comp.color === 'white' ? 'white' : 'kraft';
    const topTex = own(
      flatCaseTexture({ L: s.L, W: s.W, H: s.H, front: box.mats.front.map.image, side: box.mats.sideA.map.image, palette }, this.aniso),
    );
    if (rotated) {
      topTex.center.set(0.5, 0.5);
      topTex.rotation = Math.PI / 2;
    }
    const edge = edgeTexture(s.flute, this.aniso);
    const tile = edge.userData.tileMm * MM;
    const sideMat = (src, len, uTile) => {
      const tex = own(src.clone());
      tex.userData.shared = false;
      tex.repeat.set(len / uTile, pileH / t);
      return own(new THREE.MeshStandardMaterial({ map: tex, roughness: 1 }));
    };
    const layers = layersTexture(s.flute, this.aniso);
    // les cannelures courent dans le sens de la hauteur de la caisse (b) : coupe ondulée sur
    // les faces perpendiculaires à b, couches droites sur les deux autres
    const faceX = rotated ? sideMat(edge, sz, tile) : sideMat(layers, sz, 0.3);
    const faceZ = rotated ? sideMat(layers, sx, 0.3) : sideMat(edge, sx, tile);
    const top = own(new THREE.MeshStandardMaterial({ map: topTex, roughness: 0.9 }));
    const bottom = own(new THREE.MeshStandardMaterial({ map: paperTile(palette, this.aniso, { seed: 77 }), roughness: 0.95 }));
    const mats = [faceX, faceX, top, bottom, faceZ, faceZ];

    const pileGeo = own(new THREE.BoxGeometry(sx - 0.03, pileH, sz - 0.03).translate(0, pileH / 2, 0));
    const strapGeo = own(new THREE.BoxGeometry(sx + 0.01, pileH + 0.03, 0.13).translate(0, pileH / 2, 0));
    for (let ix = 0; ix < nx; ix++)
      for (let iz = 0; iz < nz; iz++) {
        const pile = new THREE.Group();
        const body = new THREE.Mesh(pileGeo, mats);
        body.castShadow = body.receiveShadow = true;
        pile.add(body);
        const straps = new THREE.Group();
        for (const dz of [-sz / 4, sz / 4]) {
          const st = new THREE.Mesh(strapGeo, this.strapMat);
          st.position.z = dz;
          straps.add(st);
        }
        pile.add(straps);
        pile.userData.straps = straps;
        pile.userData.base = new THREE.Vector3(-((nx - 1) * sx) / 2 + ix * sx, PH, -((nz - 1) * sz) / 2 + iz * sz);
        this.piles.push(pile);
        this.group.add(pile);
      }

    this.height = PH + pileH;
    // la caisse montée du récit se pose devant la palette
    this.heroSpot = new THREE.Vector3(Math.min(PL / 2 - box.L / 2, 3.2), 0, PW / 2 + box.W / 2 + 1.3);
    this.update(this.progress ?? 0);
  }

  /** p : 0 → rien, 1 → palette chargée et cerclée (paquets posés l'un après l'autre). */
  update(p) {
    this.progress = p;
    this.group.visible = p > 0.001;
    const palletK = smooth(0, 0.14, p);
    this.pallet.position.y = (1 - palletK) * 6;
    const n = this.piles.length;
    this.piles.forEach((pile, i) => {
      const start = 0.14 + (i / n) * 0.5;
      const k = smooth(start, start + 0.22, p);
      const base = pile.userData.base;
      pile.position.set(base.x, base.y + (1 - k) * 9, base.z);
      pile.visible = k > 0.001;
      pile.userData.straps.visible = p > 0.86;
    });
  }
}

export const PALLET = { PL, PW, PH };
