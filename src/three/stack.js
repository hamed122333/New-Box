import * as THREE from 'three';
import { smooth } from './box.js';
import { woodTexture, topPanel, paperTile } from './textures.js';
import { GRADES } from '../data/grades.js';

// Palette Europe 1200 × 800 × 144 mm
const PL = 12;
const PW = 8;
const PH = 1.44;

export class PalletStack {
  constructor(renderer) {
    this.aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    this.group = new THREE.Group();
    this.group.name = 'pallet-stack';
    this.pallet = this._buildPallet();
    this.group.add(this.pallet);
    this.boxes = null;
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._s = new THREE.Vector3(1, 1, 1);
    this._p = new THREE.Vector3();
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

  /** Recalcule le plan de palettisation pour une caisse donnée. */
  build(box) {
    if (this.boxes) {
      this.group.remove(this.boxes);
      this.boxes.geometry.dispose();
      this.boxes.material.forEach((m) => m !== box.mats.front && m !== box.mats.sideA && m.dispose());
    }
    const { L, W, H } = box;
    const nx = Math.max(1, Math.floor((PL + 0.2) / L));
    const nz = Math.max(1, Math.floor((PW + 0.2) / W));
    const layers = Math.max(1, Math.min(5, Math.floor(12 / H)));
    this.layout = { nx, nz, layers, L, W, H };

    const palette = GRADES[box.spec.grade].color === 'white' ? 'white' : 'kraft';
    const top = new THREE.MeshStandardMaterial({ map: topPanel(box.spec.L, box.spec.W, palette, this.aniso), roughness: 0.9 });
    const bottom = new THREE.MeshStandardMaterial({ map: paperTile(palette, this.aniso, { seed: 77 }), roughness: 0.95 });
    const mats = [box.mats.sideA, box.mats.sideA, top, bottom, box.mats.front, box.mats.front];
    const geo = new THREE.BoxGeometry(L, H + 0.02, W);

    // slots (hors emplacement de la caisse principale : dernier niveau, coin avant droit)
    this.slots = [];
    for (let l = 0; l < layers; l++)
      for (let ix = 0; ix < nx; ix++)
        for (let iz = 0; iz < nz; iz++) {
          const p = new THREE.Vector3(
            -((nx - 1) * L) / 2 + ix * L,
            PH + l * (H + 0.02),
            -((nz - 1) * W) / 2 + iz * W,
          );
          const isHero = l === layers - 1 && ix === nx - 1 && iz === nz - 1;
          if (isHero) this.heroSlot = p;
          else this.slots.push(p);
        }

    this.boxes = new THREE.InstancedMesh(geo, mats, Math.max(1, this.slots.length));
    this.boxes.count = this.slots.length;
    this.boxes.castShadow = true;
    this.boxes.receiveShadow = true;
    this.boxes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.group.add(this.boxes);
    this.height = PH + layers * H;
    this.update(this.progress ?? 0);
  }

  /** p : 0 → rien, 1 → palette complète (chute échelonnée). */
  update(p) {
    this.progress = p;
    this.group.visible = p > 0.001;
    const palletK = smooth(0, 0.12, p);
    this.pallet.position.y = (1 - palletK) * 6;
    const n = this.slots.length;
    for (let i = 0; i < n; i++) {
      const start = 0.1 + (i / n) * 0.62;
      const k = smooth(start, start + 0.14, p);
      const s = this.slots[i];
      this._p.set(s.x, s.y + this.layout.H / 2 + (1 - k) * 7, s.z);
      this._s.setScalar(k < 0.001 ? 0.0001 : 1);
      this._m.compose(this._p, this._q, this._s);
      this.boxes.setMatrixAt(i, this._m);
    }
    this.boxes.instanceMatrix.needsUpdate = true;
  }
}

export const PALLET = { PL, PW, PH };
