import * as THREE from 'three';
import { boardComposition, GLUE_FLAP_MM } from '../lib/calc.js';
import { PRODUCTS } from '../data/products.js';
import { printedPanel, plateTexture, holeMask, handHole, paperTile, bumpTile, edgeTexture, INKS } from './textures.js';

// 1 unité de scène = 100 mm
export const MM = 0.01;
const SLOT_MM = 6; // fente entre rabats
const TAPE_W = 0.5; // ruban 50 mm
const TILE = 1.6; // taille d'une tuile de papier (unités)
// paramètres qui changent l'impression / les textures
const TEX_KEYS = ['product', 'L', 'W', 'H', 'flute', 'outer', 'inner', 'ink', 'logo', 'brandLogo', 'certs'];

const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const smooth = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const lerp = (a, b, t) => a + (b - a) * t;

/**
 * Géométrie d'un panneau de carton (origine = coin bas-gauche, épaisseur centrée en z).
 * Les tranches reçoivent des UV « au millimètre » pour la texture de cannelure,
 * la face extérieure des UV 0–1 si elle est imprimée.
 */
function panelGeometry(w, h, t, edgeTileU, printed) {
  const g = new THREE.BoxGeometry(w, h, t);
  g.translate(w / 2, h / 2, 0);
  const pos = g.attributes.position;
  const uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const face = Math.floor(i / 4); // px, nx, py, ny, pz, nz
    const x = pos.getX(i);
    const y = pos.getY(i);
    const across = (pos.getZ(i) + t / 2) / t;
    if (face <= 1) uv.setXY(i, y / edgeTileU, across);
    else if (face <= 3) uv.setXY(i, x / edgeTileU, across);
    else if (face === 4 && printed) uv.setXY(i, x / w, y / h);
    else uv.setXY(i, x / TILE, y / TILE);
  }
  uv.needsUpdate = true;
  // 2e jeu d'UV : coordonnées 0–1 du panneau sur toutes les faces (masque des découpes)
  const uv1 = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv1[i * 2] = pos.getX(i) / w;
    uv1[i * 2 + 1] = pos.getY(i) / h;
  }
  g.setAttribute('uv1', new THREE.BufferAttribute(uv1, 2));
  return g;
}

export class CorrugatedBox {
  constructor(renderer) {
    this.aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    this.group = new THREE.Group();
    this.group.name = 'box';
    this.root = new THREE.Group();
    this.group.add(this.root);
    this.params = { lid: 0, flat: 0, tape: 1 };
    this.spec = {
      product: 'CI', // CI, CV, CID, CVD (caisse), DI, DV (découpe), PL, PLR (plaque) — voir data/products.js
      L: 400,
      W: 300,
      H: 300, // pour une plaque : L × W = format de la plaque, H inutilisé
      flute: 'C',
      outer: 'KL',
      inner: 'TL',
      ink: 'bleu',
      logo: null,
      brandLogo: null,
      certs: null,
    };
    this._disposables = [];
    this.bump = bumpTile(this.aniso);
    this._tmp = new THREE.Vector3();
  }

  /**
   * (Re)construit la caisse. Les textures ne sont régénérées que si nécessaire.
   * `deferTextures` (curseur en cours de glissement) ne refait que la géométrie : les textures
   * existantes sont étirées jusqu'à la prochaine reconstruction complète.
   */
  build(partial = {}, { deferTextures = false } = {}) {
    const { force, ...changes } = partial;
    const prev = this.spec;
    this.spec = { ...prev, ...changes };
    const s = this.spec;
    this.comp = boardComposition(s.flute, s.outer, s.inner);
    const needTex = !this.mats || force || this._staleTextures || TEX_KEYS.some((k) => prev[k] !== s[k]);
    if (needTex && deferTextures && this.mats) this._staleTextures = true;
    else if (needTex) {
      this._buildMaterials();
      this._staleTextures = false;
    }
    this._buildGeometry();
    this.update();
    return this;
  }

  _buildMaterials() {
    // les textures mises en cache (papier, tranche…) sont partagées : on ne libère que les autres
    const release = (t) => t && !t.userData.shared && t.dispose();
    this.mats?.all.forEach((m) => {
      release(m.map);
      if (m.bumpMap !== this.bump) release(m.bumpMap);
      m.dispose();
    });
    const s = this.spec;
    const product = PRODUCTS[s.product];
    const palette = this.comp.color === 'white' ? 'white' : 'kraft';
    const common = {
      palette,
      printed: product.printed,
      handHole: !!product.diecut,
      certs: s.certs,
      ink: INKS[s.ink] ?? INKS.bleu,
      comp: this.comp,
      dims: { L: s.L, W: s.W, H: s.H },
      logo: s.logo,
      brandLogo: s.brandLogo,
    };
    // Les faces imprimées ont des UV 0–1 : on répète le grain à l'échelle réelle.
    const bumpFor = (wMm, hMm) => {
      if (!wMm) return this.bump;
      const b = this.bump.clone();
      b.userData.shared = false;
      b.repeat.set((wMm * MM) / TILE, (hMm * MM) / TILE);
      return b;
    };
    const std = (map, extra = {}, wMm = 0, hMm = 0) =>
      new THREE.MeshStandardMaterial({
        map,
        roughness: 0.93,
        metalness: 0,
        bumpMap: bumpFor(wMm, hMm),
        bumpScale: 0.6,
        ...extra,
      });

    // deux faces imprimées suffisent : avant = arrière, côté gauche = côté droit
    const front = std(printedPanel('front', { ...common, w: s.L, h: s.H, seed: 11 }, this.aniso), {}, s.L, s.H);
    // caisse découpée : poignées ajourées sur les petits côtés (faces extérieure et intérieure)
    const cut = product.diecut ? { alphaMap: holeMask(s.W, s.H, this.aniso), alphaTest: 0.5 } : {};
    const side = std(printedPanel('side', { ...common, w: s.W, h: s.H, seed: 13 }, this.aniso), cut, s.W, s.H);
    const outer = std(paperTile(palette, this.aniso, { seed: 5, stripes: 20 }));
    const inner = std(paperTile('kraftInner', this.aniso, { seed: 9 }), { roughness: 0.96 });
    const edgeTex = edgeTexture(s.flute, this.aniso);
    const edge = new THREE.MeshStandardMaterial({ map: edgeTex, roughness: 1, metalness: 0 });
    const tape = new THREE.MeshStandardMaterial({
      color: 0xc9975a,
      roughness: 0.32,
      metalness: 0,
      transparent: true,
      opacity: 0.92,
    });
    this.edgeTileU = edgeTex.userData.tileMm * MM;
    this.mats = { front, back: front, sideA: side, sideB: side, outer, inner, edge, tape, all: [front, side, outer, inner, edge, tape] };
    if (product.diecut) {
      this.mats.sideInner = std(paperTile('kraftInner', this.aniso, { seed: 9 }), { roughness: 0.96, ...cut });
      this.mats.all.push(this.mats.sideInner);
    }
    if (product.family === 'plaque') {
      const pitch = this.comp.flute.layers.at(-1).pitch;
      this.mats.plate = std(plateTexture({ w: s.L, h: s.W, palette, pitch, scored: product.scored }, this.aniso), {}, s.L, s.W);
      this.mats.all.push(this.mats.plate);
    }
  }

  _clearGeometry() {
    this._disposables.forEach((g) => g.dispose());
    this._disposables = [];
    this.root.clear();
  }

  _mesh(geo, mats) {
    this._disposables.push(geo);
    const m = new THREE.Mesh(geo, mats);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }

  _buildGeometry() {
    this._clearGeometry();
    const s = this.spec;
    const M = this.mats;
    const L = s.L * MM;
    const W = s.W * MM;
    const H = s.H * MM;
    const t = this.comp.thickness * MM;
    const fh = W / 2;
    const slot = SLOT_MM * MM;
    const g = GLUE_FLAP_MM * MM;
    Object.assign(this, { L, W, H, t, fh, g });

    // Plaque (PL / PLR) : une seule feuille, présentée debout comme un flan
    if (this.family === 'plaque') {
      const geo = panelGeometry(L, W, t, this.edgeTileU, true);
      geo.translate(-L / 2, 0.25, 0);
      this.root.add(this._mesh(geo, [M.edge, M.edge, M.edge, M.edge, M.plate, M.inner]));
      this.creases = [];
      this.flaps = [];
      this.tapes = [];
      return;
    }

    const widths = [L, W, L, W];
    const faces = [M.front, M.sideA, M.back, M.sideB];
    const matsFor = (outer, inner = M.inner) => [M.edge, M.edge, M.edge, M.edge, outer, inner];
    const plainMats = matsFor(M.outer);

    this.creases = [];
    this.flaps = [];
    this.tapes = [];
    let parent = this.root;

    widths.forEach((w, i) => {
      const hinge = new THREE.Group();
      if (i > 0) {
        hinge.position.x = widths[i - 1];
        this.creases.push(hinge);
      }
      parent.add(hinge);
      const isSide = i % 2 === 1;
      hinge.add(this._mesh(panelGeometry(w, H, t, this.edgeTileU, true), matsFor(faces[i], isSide && M.sideInner ? M.sideInner : M.inner)));

      const major = i % 2 === 0;
      for (const top of [true, false]) {
        const fHinge = new THREE.Group();
        const geo = panelGeometry(w - slot, fh, t, this.edgeTileU, false);
        geo.translate(slot / 2, top ? 0 : -fh, 0);
        fHinge.add(this._mesh(geo, plainMats));
        hinge.add(fHinge);
        const flap = { hinge: fHinge, major, top, panel: i };
        this.flaps.push(flap);

        // Ruban : une moitié sur chaque grand rabat supérieur
        if (top && major) {
          const tg = new THREE.BoxGeometry(w - slot, TAPE_W / 2, 0.004);
          tg.translate(w / 2, fh - TAPE_W / 4, t / 2 + 0.003);
          const tm = this._mesh(tg, M.tape);
          tm.castShadow = false;
          fHinge.add(tm);
          this.tapes.push(tm);
        }
      }

      // Retours de ruban sur les petits côtés (arrêtés au-dessus de la poignée si caisse découpée)
      if (!major) {
        const hole = this.product.diecut ? handHole(s.W, s.H) : null;
        const len = hole ? Math.max(0.12, (hole.cy - hole.h / 2 - 8) * MM) : 0.6;
        const tg = new THREE.BoxGeometry(TAPE_W, len, 0.004);
        tg.translate(w / 2, H - len / 2, t / 2 + 0.003);
        const tm = this._mesh(tg, M.tape);
        tm.castShadow = false;
        hinge.add(tm);
        this.tapes.push(tm);
      }
      parent = hinge;
    });

    // Patte de collage
    const glueHinge = new THREE.Group();
    glueHinge.position.x = W;
    const inset = 0.06;
    const gg = panelGeometry(g, H - 2 * inset, t, this.edgeTileU, false);
    gg.translate(0, inset, 0);
    this.glueMesh = this._mesh(gg, plainMats);
    glueHinge.add(this.glueMesh);
    parent.add(glueHinge);
    this.creases.push(glueHinge);

    this.frontTopFlap = this.flaps.find((f) => f.panel === 0 && f.top);
  }

  /** Applique les paramètres lid (0 fermé → 1 ouvert), flat (0 monté → 1 à plat), tape. */
  update() {
    if (this.family === 'plaque') {
      this.root.position.set(0, 0, 0);
      return;
    }
    const { lid, flat, tape } = this.params;
    const { L, W, H, t, fh, g } = this;
    const flapFold = 1 - smooth(0, 0.45, flat);
    const flatK = smooth(0.3, 1, flat);

    this.creases.forEach((c, i) => {
      const f = 1 - smooth(0.28 + i * 0.07, 0.72 + i * 0.07, flat);
      c.rotation.y = (Math.PI / 2) * f;
    });
    this.glueMesh.position.z = -t * (1 - flatK);

    const majorOpen = smooth(0, 0.6, lid);
    const minorOpen = smooth(0.3, 1, lid);
    for (const f of this.flaps) {
      const stack = f.major ? t * (1 - flatK) : 0;
      if (f.top) {
        const o = f.major ? majorOpen : minorOpen;
        const a = lerp(-Math.PI / 2, f.major ? 0.45 : 0.3, o);
        f.hinge.rotation.x = a * flapFold;
        f.hinge.position.y = H + stack;
      } else {
        f.hinge.rotation.x = (Math.PI / 2) * flapFold;
        f.hinge.position.y = -stack;
      }
    }

    this.root.position.set(lerp(-L / 2, -(L + W + g / 2), flatK), lerp(1.5 * t, fh + 0.25, flatK), lerp(W / 2, 0, flatK));

    const vis = tape > 0.01;
    this.mats.tape.opacity = 0.92 * tape;
    this.tapes.forEach((m) => (m.visible = vis));
  }

  /** Centre visuel (espace local du groupe) selon l'état plié / ouvert / à plat. */
  center(target = new THREE.Vector3()) {
    if (this.family === 'plaque') return target.set(0, this.W / 2 + 0.25, 0);
    const flatK = smooth(0.3, 1, this.params.flat);
    const lidK = smooth(0, 0.6, this.params.lid) * (1 - flatK);
    return target.set(0, lerp(this.H / 2 + (this.fh * lidK) / 2, this.fh + 0.25 + this.H / 2, flatK), 0);
  }

  /** Point d'arrivée de la « plongée » : milieu de la tranche du grand rabat avant. */
  diveAnchor() {
    const h = this.frontTopFlap.hinge;
    h.updateWorldMatrix(true, false);
    const tip = h.localToWorld(new THREE.Vector3(this.L / 2, this.fh, 0));
    const up = new THREE.Vector3(0, 1, 0).transformDirection(h.matrixWorld);
    const out = new THREE.Vector3(0, 0, 1).transformDirection(h.matrixWorld);
    return { tip, up, out };
  }

  get product() {
    return PRODUCTS[this.spec.product];
  }

  get family() {
    return this.product.family;
  }

  get size() {
    return Math.max(this.L, this.W, this.H);
  }
}
