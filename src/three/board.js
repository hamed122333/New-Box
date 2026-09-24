import * as THREE from 'three';
import { FLUTES } from '../data/flutes.js';
import { paperTile, bumpTile } from './textures.js';
import { lerp } from './box.js';

// Échantillon de plaque en coupe — unités : millimètres.
const LEN = 48; // longueur (x)
const DEPTH = 30; // profondeur (z) = sens des cannelures
const CAL = 0.32; // épaisseur d'un papier (légèrement exagérée pour la lisibilité)
const SEG = 520;
const MAX_GLUE = 160;

/**
 * Feuille ondulée volumique : surfaces haute/basse + chants avant/arrière/extrémités.
 * Les positions sont recalculées en place quand le profil change (morphing).
 */
class FluteSheet {
  constructor(material) {
    const n = SEG + 1;
    // blocs : top(n*2) bottom(n*2) front(n*2) back(n*2) ends(2*4)
    this.count = n * 8 + 8;
    this.geometry = new THREE.BufferGeometry();
    this.pos = new Float32Array(this.count * 3);
    const uv = new Float32Array(this.count * 2);
    const idx = [];
    const strip = (base, flip) => {
      for (let i = 0; i < SEG; i++) {
        const a = base + i * 2;
        const b = a + 1;
        const c = a + 2;
        const d = a + 3;
        if (flip) idx.push(a, c, b, b, c, d);
        else idx.push(a, b, c, b, d, c);
      }
    };
    strip(0, false); // top
    strip(n * 2, true); // bottom
    strip(n * 4, true); // front
    strip(n * 6, false); // back
    const e = n * 8;
    idx.push(e, e + 1, e + 2, e + 1, e + 3, e + 2, e + 4, e + 6, e + 5, e + 5, e + 6, e + 7);
    for (let i = 0; i < this.count; i++) {
      uv[i * 2] = (i % (n * 2)) / 2 / 40;
      uv[i * 2 + 1] = i % 2;
    }
    this.geometry.setIndex(idx);
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    this.mesh = new THREE.Mesh(this.geometry, material);
  }

  /** @param {number} base  y du bas de l'onde  @param {number} h hauteur  @param {number} p pas */
  set(base, h, p, cal) {
    const n = SEG + 1;
    const P = this.pos;
    const amp = Math.max(0.0001, h - cal);
    const k = (Math.PI * 2) / p;
    const put = (i, x, y, z) => {
      P[i * 3] = x;
      P[i * 3 + 1] = y;
      P[i * 3 + 2] = z;
    };
    const z0 = DEPTH / 2;
    let first;
    let last;
    for (let i = 0; i < n; i++) {
      const x = -LEN / 2 + (i / SEG) * LEN;
      const ph = (x + LEN / 2) * k;
      const yc = base + cal / 2 + (amp * (1 - Math.cos(ph))) / 2;
      const dy = (amp / 2) * Math.sin(ph) * k;
      const inv = 1 / Math.hypot(dy, 1);
      const nx = -dy * inv * (cal / 2);
      const ny = inv * (cal / 2);
      const tx = x + nx;
      const ty = yc + ny;
      const bx = x - nx;
      const by = yc - ny;
      put(i * 2, tx, ty, z0);
      put(i * 2 + 1, tx, ty, -z0);
      put(n * 2 + i * 2, bx, by, z0);
      put(n * 2 + i * 2 + 1, bx, by, -z0);
      put(n * 4 + i * 2, tx, ty, z0);
      put(n * 4 + i * 2 + 1, bx, by, z0);
      put(n * 6 + i * 2, tx, ty, -z0);
      put(n * 6 + i * 2 + 1, bx, by, -z0);
      if (i === 0) first = [tx, ty, bx, by];
      if (i === n - 1) last = [tx, ty, bx, by];
    }
    const e = n * 8;
    put(e, first[0], first[1], z0);
    put(e + 1, first[0], first[1], -z0);
    put(e + 2, first[2], first[3], z0);
    put(e + 3, first[2], first[3], -z0);
    put(e + 4, last[0], last[1], z0);
    put(e + 5, last[0], last[1], -z0);
    put(e + 6, last[2], last[3], z0);
    put(e + 7, last[2], last[3], -z0);
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.computeVertexNormals();
    this.geometry.computeBoundingSphere();
  }
}

export class BoardSample {
  constructor(renderer) {
    const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const bump = bumpTile(aniso);
    const mat = (pal, seed, extra = {}) => {
      const map = paperTile(pal, aniso, { seed, size: 512 });
      map.repeat.set(1.5, 1);
      return new THREE.MeshStandardMaterial({ map, roughness: 0.95, bumpMap: bump, bumpScale: 1.2, side: THREE.DoubleSide, ...extra });
    };
    this.materials = {
      outer: mat('kraft', 31),
      inner: mat('kraftInner', 32),
      mid: mat('kraftInner', 33),
      flute: mat('fluting', 34),
      glue: new THREE.MeshStandardMaterial({ color: 0xe6d3a8, roughness: 0.45, transparent: true, opacity: 0.7 }),
    };

    this.group = new THREE.Group(); // pivot pour le test ECT
    this.inner = new THREE.Group(); // contenu centré verticalement
    this.group.add(this.inner);

    const linerGeo = new THREE.BoxGeometry(LEN, 1, DEPTH);
    this.L0 = new THREE.Mesh(linerGeo, this.materials.inner);
    this.L1 = new THREE.Mesh(linerGeo, this.materials.mid);
    this.L2 = new THREE.Mesh(linerGeo, this.materials.outer);
    this.F1 = new FluteSheet(this.materials.flute);
    this.F2 = new FluteSheet(this.materials.flute);
    const glueGeo = new THREE.CylinderGeometry(1, 1, DEPTH, 10, 1);
    glueGeo.rotateX(Math.PI / 2);
    this.glue = new THREE.InstancedMesh(glueGeo, this.materials.glue, MAX_GLUE);
    this.glue.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.inner.add(this.L0, this.L1, this.L2, this.F1.mesh, this.F2.mesh, this.glue);

    this.anchors = {
      outer: new THREE.Vector3(),
      flute: new THREE.Vector3(),
      inner: new THREE.Vector3(),
      glue: new THREE.Vector3(),
      mid: new THREE.Vector3(),
      flute2: new THREE.Vector3(),
    };
    this._m = new THREE.Matrix4();
    this._key = '';
    this.layout = { total: 0 };
    this.setState({ from: 'C', to: 'C', t: 0, explode: 0 });
  }

  /** Interpole entre deux cannelures (morphing) et applique l'éclaté. */
  setState({ from, to, t, explode }) {
    const key = `${from}|${to}|${t.toFixed(4)}|${explode.toFixed(4)}`;
    if (key === this._key) return;
    this._key = key;

    const a = FLUTES[from];
    const b = FLUTES[to];
    const pick = (f, i) => f.layers[i] ?? f.layers[0];
    const mix = (i) => ({
      pitch: lerp(pick(a, i).pitch, pick(b, i).pitch, t),
      height: lerp(pick(a, i).height, pick(b, i).height, t),
    });
    const f1 = mix(0);
    const f2 = mix(1);
    const dbl = lerp(a.layers.length - 1, b.layers.length - 1, t); // 0 simple → 1 double
    const e = explode * 5.5;

    let y = 0;
    const L0y = y;
    y += CAL + e;
    const F1y = y;
    y += f1.height + e;
    const L1y = y;
    const cMid = CAL * dbl;
    y += (cMid + e) * dbl;
    const F2y = y;
    const h2 = f2.height * dbl;
    y += (h2 + e) * dbl;
    const L2y = y;
    y += CAL;
    const total = y;

    const place = (mesh, y0, th) => {
      mesh.scale.y = Math.max(0.0001, th);
      mesh.position.y = y0 + th / 2;
    };
    place(this.L0, L0y, CAL);
    place(this.L1, L1y, cMid);
    place(this.L2, L2y, CAL);
    this.L1.visible = dbl > 0.01;
    this.F1.set(F1y, f1.height, f1.pitch, CAL);
    this.F2.mesh.visible = dbl > 0.01;
    if (this.F2.mesh.visible) this.F2.set(F2y, Math.max(0.05, h2), f2.pitch, CAL * Math.max(0.2, dbl));
    this.inner.position.y = -total / 2;

    // Lignes de colle aux points de contact onde / couverture
    let gi = 0;
    const r = 0.15;
    // (la colle reste solidaire de l'onde quand on éclate la plaque)
    const addGlue = (fy, h, p, s) => {
      for (let x = 0; x <= LEN + 1e-6 && gi < MAX_GLUE; x += p / 2) {
        const crest = Math.round((x / p) * 2) % 2 === 1;
        const gy = crest ? fy + h - r * 0.4 : fy + r * 0.4;
        this._m.makeScale(r * s, r * 0.65 * s, 1).setPosition(-LEN / 2 + x, gy, 0);
        this.glue.setMatrixAt(gi++, this._m);
      }
    };
    addGlue(F1y, f1.height, f1.pitch, 1);
    if (dbl > 0.01) addGlue(F2y, h2, f2.pitch, dbl);
    this.glue.count = gi;
    this.glue.instanceMatrix.needsUpdate = true;

    // Ancres des étiquettes (face avant, espace local de `inner`)
    const zf = DEPTH / 2;
    this.anchors.outer.set(LEN * 0.06, L2y + CAL, zf);
    // point à mi-pente de l'onde (phase = 1/4 de pas) pour tomber sur le papier
    const xf = -LEN / 2 + f1.pitch * (Math.round((0.5 * LEN) / f1.pitch) + 0.25);
    this.anchors.flute.set(xf, F1y + f1.height / 2, zf);
    this.anchors.inner.set(-LEN * 0.32, L0y, zf);
    this.anchors.glue.set(-LEN / 2 + f1.pitch * 3, F1y + r * 0.4, zf);
    this.anchors.mid.set(LEN * 0.12, L1y + cMid / 2, zf);
    this.anchors.flute2.set(-LEN * 0.1, F2y + h2 / 2, zf);

    this.layout = { total, f1, f2, dbl };
  }

  /** Position monde d'une ancre. */
  anchorWorld(name, target = new THREE.Vector3()) {
    this.inner.updateWorldMatrix(true, false);
    return target.copy(this.anchors[name]).applyMatrix4(this.inner.matrixWorld);
  }
}

export const BOARD = { LEN, DEPTH, CAL };
