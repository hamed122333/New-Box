import * as THREE from 'three';
import { panelGeometry, MM, TILE, smooth, lerp } from './box.js';
import { boardComposition } from '../lib/calc.js';
import { STYLES, dividerGrid } from '../data/styles.js';
import { PRODUCTS } from '../data/products.js';
import {
  paperTile,
  bumpTile,
  edgeTexture,
  holeMask,
  INKS,
  pizzaLidTexture,
  mailerLidTexture,
  insideMessageTexture,
  traySideTexture,
  trayEndTexture,
  pizzaTexture,
  orangeBump,
} from './textures.js';

// paramètres qui changent l'impression / les textures
const TEX_KEYS = ['style', 'product', 'L', 'W', 'H', 'flute', 'outer', 'inner', 'ink', 'logo', 'brandLogo'];
const TRAY_HOLE = 0.28; // hauteur relative des poignées du plateau
const ORANGE_R = 0.37; // orange de 74 mm

const INSIDE = {
  pizza: { title: 'Bon appétit !', subtitle: 'Votre pizza, gardée bien au chaud.' },
  mailer: { title: 'Merci !', subtitle: 'Votre commande a été préparée avec soin.' },
};

/**
 * Modèles de découpe (produits DI / DV) : boîte pizza, boîte e-commerce, plateau, croisillons.
 * Même principe que la caisse américaine : panneaux de carton reliés par des charnières,
 * pilotés par `params.lid` (ouverture / démontage) et `params.flat` (mise à plat = plan de découpe).
 *
 * Construction d'un panneau « couché » : il part de sa charnière vers +z local, face extérieure
 * vers −y. Une paroi = un repère posé sur un bord du fond (tourné pour que +z pointe vers
 * l'extérieur) + une charnière qui la relève (rotation x de −90°).
 */
export class DieCutModel {
  constructor(renderer) {
    this.aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    this.group = new THREE.Group();
    this.group.name = 'diecut';
    this.root = new THREE.Group();
    this.shell = new THREE.Group(); // carton seul (cadrage), sans le contenu
    this.root.add(this.shell);
    this.group.add(this.root);
    this.params = { lid: 0, flat: 0, fill: 1 };
    this.spec = { style: 'pizza', product: 'DI', L: 330, W: 330, H: 40, flute: 'E', outer: 'KL', inner: 'TL', ink: 'bleu', logo: null, brandLogo: null };
    this.bump = bumpTile(this.aniso);
    this._geos = [];
    this._box = new THREE.Box3();
    this._v = new THREE.Vector3();
  }

  get style() {
    return STYLES[this.spec.style];
  }

  get product() {
    return PRODUCTS[this.spec.product];
  }

  /** Vue d'ensemble pour la mise à plat : le plan de découpe est posé au sol, on le regarde de haut. */
  get flatViewDir() {
    return this._flatDir || (this._flatDir = new THREE.Vector3(0, 1, 0.45).normalize());
  }

  build(partial = {}, { deferTextures = false } = {}) {
    const { force, ...changes } = partial;
    const prev = this.spec;
    this.spec = { ...prev, ...changes };
    const s = this.spec;
    this.comp = boardComposition(s.flute, s.outer, s.inner);
    const needTex = !this.mats || force || this._staleTextures || TEX_KEYS.some((k) => prev[k] !== s[k]);
    if (needTex && deferTextures && this.mats && prev.style === s.style) this._staleTextures = true;
    else if (needTex) {
      this._buildMaterials();
      this._staleTextures = false;
    }
    this._buildGeometry();
    this.update();
    return this;
  }

  // ------------------------------------------------------------ matériaux
  _buildMaterials() {
    const release = (t) => t && !t.userData.shared && t.dispose();
    this.mats?.all.forEach((m) => {
      release(m.map);
      if (m.bumpMap !== this.bump) release(m.bumpMap);
      m.dispose();
    });
    const s = this.spec;
    const printed = this.product.printed;
    const palette = this.comp.color === 'white' ? 'white' : 'kraft';
    const pitch = this.comp.flute.layers.at(-1).pitch;
    const ink = INKS[s.ink] ?? INKS.bleu;
    const base = { palette, ink, pitch, brandLogo: s.brandLogo, logo: s.logo };
    const all = [];
    const bumpFor = (wMm, hMm) => {
      if (!wMm) return this.bump;
      const b = this.bump.clone();
      b.userData.shared = false;
      b.repeat.set((wMm * MM) / TILE, (hMm * MM) / TILE);
      return b;
    };
    const std = (map, extra = {}, wMm = 0, hMm = 0) => {
      const m = new THREE.MeshStandardMaterial({ map, roughness: 0.93, metalness: 0, bumpMap: bumpFor(wMm, hMm), bumpScale: 0.6, ...extra });
      all.push(m);
      return m;
    };
    const edgeTex = edgeTexture(s.flute, this.aniso);
    this.edgeTileU = edgeTex.userData.tileMm * MM;
    const M = {
      edge: std(edgeTex, { roughness: 1, bumpMap: null }),
      outer: std(paperTile(palette, this.aniso, { seed: 5, stripes: 20 })),
      inner: std(paperTile('kraftInner', this.aniso, { seed: 9 }), { roughness: 0.96 }),
    };
    const id = s.style;
    if (id === 'pizza' || id === 'mailer') {
      const top = printed
        ? (id === 'pizza' ? pizzaLidTexture : mailerLidTexture)({ ...base, w: s.L, h: s.W, rotate: true }, this.aniso)
        : null;
      M.lidTop = top ? std(top, {}, s.L, s.W) : M.outer;
      M.lidInside = printed ? std(insideMessageTexture({ ...base, w: s.L, h: s.W, ...INSIDE[id] }, this.aniso), { roughness: 0.96 }, s.L, s.W) : M.inner;
      this.printedInside = printed;
      if (id === 'pizza') {
        M.food = std(pizzaTexture(this.aniso), { roughness: 0.7, bumpMap: null });
        M.crust = std(null, { color: 0xc98840, roughness: 0.8, bumpMap: null });
      }
    }
    if (id === 'tray') {
      const cut = { alphaMap: holeMask(s.W, s.H, this.aniso, TRAY_HOLE), alphaTest: 0.5 };
      M.trayLong = printed ? std(traySideTexture({ ...base, w: s.L, h: s.H }, this.aniso), {}, s.L, s.H) : M.outer;
      M.trayEnd = std(trayEndTexture({ ...base, w: s.W, h: s.H, hFrac: TRAY_HOLE }, this.aniso), cut, s.W, s.H);
      M.trayEndInner = std(paperTile('kraftInner', this.aniso, { seed: 9 }), { roughness: 0.96, ...cut });
      M.fruit = std(null, { color: 0xe0640a, roughness: 0.55, bumpMap: orangeBump(this.aniso), bumpScale: 1.5, envMapIntensity: 0.6 });
    }
    M.all = all;
    this.mats = M;
  }

  // ------------------------------------------------------------ géométrie
  _plate(w, len, mats, printedInner = false) {
    const g = panelGeometry(w, len, this.t, this.edgeTileU, true, printedInner);
    g.rotateX(Math.PI / 2); // x ∈ [0, w], z ∈ [0, len], face extérieure vers −y
    g.translate(-w / 2, 0, 0);
    this._geos.push(g);
    const m = new THREE.Mesh(g, mats);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }

  /** Paroi relevée sur un bord du fond : repère (x, z, rotY) + charnière + panneau. */
  _wall(x, z, rotY, w, len, mats) {
    const frame = new THREE.Group();
    frame.position.set(x, this.t / 2, z);
    frame.rotation.y = rotY;
    const hinge = new THREE.Group();
    hinge.add(this._plate(w, len, mats));
    frame.add(hinge);
    this.shell.add(frame);
    return hinge;
  }

  _buildGeometry() {
    this._geos.forEach((g) => g.dispose());
    this._geos = [];
    this.shell.clear();
    if (this.contents) this.root.remove(this.contents);
    const s = this.spec;
    this.L = s.L * MM;
    this.W = s.W * MM;
    this.H = s.H * MM;
    this.t = this.comp.thickness * MM;
    this.walls = [];
    this.lid = null;
    this.contents = null;
    if (s.style === 'divider') this._buildDivider();
    else this._buildTray(s.style !== 'tray');
  }

  /** Fond + 4 parois ; pour la boîte pizza / e-commerce : couvercle, rabat rentrant, rabats latéraux. */
  _buildTray(withLid) {
    const { L, W, H, t } = this;
    const M = this.mats;
    const E = M.edge;
    const plain = [E, E, E, E, M.outer, M.inner];
    const base = this._plate(L, W, plain);
    base.position.set(0, t / 2, -W / 2);
    this.shell.add(base);

    const longOuter = M.trayLong ?? M.outer;
    const front = this._wall(0, W / 2, 0, L, H, [E, E, E, E, longOuter, M.inner]);
    const back = this._wall(0, -W / 2, Math.PI, L, H, [E, E, E, E, longOuter, M.inner]);
    const endMats = M.trayEnd ? [E, E, E, E, M.trayEnd, M.trayEndInner] : plain;
    const right = this._wall(L / 2, 0, Math.PI / 2, W, H, endMats);
    const left = this._wall(-L / 2, 0, -Math.PI / 2, W, H, endMats);
    this.walls = [front, back, right, left];

    if (withLid) {
      // couvercle articulé en haut de la paroi arrière
      const lid = new THREE.Group();
      lid.position.z = H;
      lid.add(this._plate(L, W - t, [E, E, E, E, M.lidTop, M.lidInside], this.printedInside));
      back.add(lid);
      this.lid = lid;
      // rabat rentrant (avant) et rabats latéraux, logés à l'intérieur des parois
      const flapLen = Math.max(0.1, H - 2 * t);
      const tuck = new THREE.Group();
      tuck.position.z = W - t;
      tuck.add(this._plate(L - 4 * t, flapLen, plain));
      lid.add(tuck);
      this.flaps = [tuck];
      for (const side of [1, -1]) {
        const frame = new THREE.Group();
        frame.position.set(side * (L / 2 - t), 0, (W - t) / 2);
        frame.rotation.y = (side * Math.PI) / 2;
        const hinge = new THREE.Group();
        hinge.add(this._plate((W - t) * 0.86, flapLen, plain));
        frame.add(hinge);
        lid.add(frame);
        this.flaps.push(hinge);
      }
    }

    // contenu : pizza dans la boîte pizza, oranges dans le plateau
    if (this.spec.style === 'pizza') {
      const r = Math.min(L, W) * 0.44;
      const geo = new THREE.CylinderGeometry(r, r, Math.min(0.12, H * 0.5), 64);
      this._geos.push(geo);
      const pizza = new THREE.Mesh(geo, [M.crust, M.food, M.crust]);
      pizza.position.y = t + Math.min(0.06, H * 0.25);
      pizza.castShadow = true;
      this.root.add(pizza);
      this.contents = pizza;
    } else if (this.spec.style === 'tray') {
      const step = ORANGE_R * 2 + 0.03;
      const nx = Math.max(1, Math.floor((L - 0.05) / step));
      const nz = Math.max(1, Math.floor((W - 0.05) / step));
      const geo = new THREE.SphereGeometry(ORANGE_R, 24, 16);
      this._geos.push(geo);
      const fruits = new THREE.InstancedMesh(geo, M.fruit, nx * nz);
      fruits.castShadow = true;
      fruits.userData.slots = [];
      for (let i = 0; i < nx; i++)
        for (let j = 0; j < nz; j++)
          fruits.userData.slots.push(new THREE.Vector3(-((nx - 1) * step) / 2 + i * step, t + ORANGE_R, -((nz - 1) * step) / 2 + j * step));
      fruits.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.root.add(fruits);
      this.contents = fruits;
    }
  }

  /** Croisillons : bandes emboîtées dans les deux sens. */
  _buildDivider() {
    const { L, W, H } = this;
    const M = this.mats;
    const mats = [M.edge, M.edge, M.edge, M.edge, M.outer, M.inner];
    const { nx, nz } = dividerGrid(this.spec.L, this.spec.W);
    const strip = (len) => {
      const g = panelGeometry(len, H, this.t, this.edgeTileU, false);
      g.translate(-len / 2, 0, 0);
      this._geos.push(g);
      const m = new THREE.Mesh(g, mats);
      m.castShadow = m.receiveShadow = true;
      return m;
    };
    this.setA = new THREE.Group();
    this.setB = new THREE.Group();
    for (let j = 1; j < nz; j++) {
      const m = strip(L);
      m.position.z = -W / 2 + (j * W) / nz;
      this.setA.add(m);
    }
    for (let i = 1; i < nx; i++) {
      const m = strip(W);
      m.rotation.y = Math.PI / 2;
      m.position.x = -L / 2 + (i * L) / nx;
      this.setB.add(m);
    }
    this.shell.add(this.setA, this.setB);
  }

  // ------------------------------------------------------------ animation
  update() {
    const { lid, flat, fill } = this.params;
    if (this.spec.style === 'divider') {
      this.setB.position.y = smooth(0, 1, lid) * this.H * 1.15; // démontage : les bandes remontent
      return;
    }
    const fWalls = 1 - smooth(0.5, 1, flat); // les parois se relèvent d'abord…
    const fLid = 1 - smooth(0, 0.5, flat); // …puis le couvercle se ferme
    for (const w of this.walls) w.rotation.x = (-Math.PI / 2) * fWalls;
    if (this.lid) {
      const o = smooth(0, 1, lid);
      this.lid.rotation.x = lerp(-Math.PI / 2, 0.35, o) * fLid;
      const f = lerp(-Math.PI / 2, -0.35, smooth(0, 0.55, lid)) * fLid;
      for (const flap of this.flaps) flap.rotation.x = f;
    }
    if (this.contents) {
      const show = flat < 0.02;
      this.contents.visible = show;
      if (show && this.contents.isInstancedMesh) {
        // les oranges tombent dans le plateau (fill : 0 → 1)
        const m = new THREE.Matrix4();
        const slots = this.contents.userData.slots;
        slots.forEach((p, i) => {
          const start = (i / slots.length) * 0.7;
          const k = smooth(start, start + 0.3, fill);
          const sc = k < 0.001 ? 0.0001 : 0.55 + 0.45 * Math.min(1, k * 2);
          m.makeScale(sc, sc, sc).setPosition(p.x, p.y + (1 - k) * 2.2, p.z);
          this.contents.setMatrixAt(i, m);
        });
        this.contents.instanceMatrix.needsUpdate = true;
      }
    }
  }

  /** Boîte englobante en repère local (sans la rotation du groupe). */
  _localBox() {
    const ry = this.group.rotation.y;
    const pos = this._v.copy(this.group.position);
    this.group.rotation.y = 0;
    this.group.position.set(0, 0, 0);
    this.group.updateMatrixWorld(true);
    this._box.setFromObject(this.shell);
    this.group.rotation.y = ry;
    this.group.position.copy(pos);
    this.group.updateMatrixWorld(true);
    return this._box;
  }

  center(target = new THREE.Vector3()) {
    return this._localBox().getCenter(target);
  }

  /** Rayon de la sphère englobante (cadrage caméra). */
  radius() {
    return this._localBox().getSize(this._v).length() / 2;
  }
}
