import * as THREE from 'three';
import { smooth, lerp } from './three/box.js';
import { FLUTE_STORY } from './data/flutes.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();
const tmpC = new THREE.Vector3();
const tmpD = new THREE.Vector3();
const Y = new THREE.Vector3(0, 1, 0);

/**
 * Applique l'état (récit ou configurateur) aux objets 3D et à la caméra.
 */
export class Experience {
  constructor({ stage, box, board, stack, lineup, diecut }) {
    Object.assign(this, { stage, box, board, stack, lineup, diecut });
    diecut.group.visible = false;
    stage.boxScene.add(box.group, stack.group, lineup.group, diecut.group);
    stage.macroScene.add(board.group);
    this._buildTestRig();
    this.fitFactor = 1;
  }

  // Presse du test ECT (plateaux + flèche d'effort)
  _buildTestRig() {
    const steel = new THREE.MeshStandardMaterial({ color: 0xa3a9b0, metalness: 0.9, roughness: 0.32 });
    const plateGeo = new THREE.BoxGeometry(62, 2.4, 26);
    this.plateTop = new THREE.Mesh(plateGeo, steel);
    this.plateBottom = new THREE.Mesh(plateGeo, steel);
    const accent = new THREE.MeshStandardMaterial({ color: 0xf49c21, roughness: 0.4, emissive: 0x5a3200 }); // orange New Box
    this.arrow = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 12, 20), accent);
    shaft.position.y = 9;
    const head = new THREE.Mesh(new THREE.ConeGeometry(2.6, 5, 24), accent);
    head.rotation.x = Math.PI;
    head.position.y = 2.5;
    this.arrow.add(shaft, head);
    this.rig = new THREE.Group();
    this.rig.add(this.plateTop, this.plateBottom, this.arrow);
    this.stage.macroScene.add(this.rig);
  }

  // ------------------------------------------------------------ caméras
  /** Plans caméra du monde « caisse ». Calculés à la volée (dimensions variables). */
  boxKey(i, out) {
    const b = this.box;
    const s = b.size / 4;
    const c = tmpD.set(0, b.H / 2, 0);
    const f = this.fitFactor;
    const set = (px, py, pz, tx, ty, tz) => {
      out.target.set(tx, ty, tz);
      out.pos.set(px, py, pz).sub(out.target).multiplyScalar(f).add(out.target);
    };
    const gamme = (tx, ty) => set(tx + 6.2, ty + 9.2, 17.6, tx, ty, 0);
    switch (i) {
      case 0:
        return set(c.x + 6.2 * s, c.y + 5.4 * s, c.z + 10.2 * s, 0, c.y - 0.1, 0);
      case 1:
        return set(4.8 * s, c.y + 8.4 * s, 9.6 * s, 0, c.y + 0.5 * s, 0);
      case 2: {
        const { tip, up, out: o } = b.diveAnchor();
        out.target.copy(tip);
        out.pos.copy(tip).addScaledVector(up, 0.17).addScaledVector(o, 0.07);
        out.pos.x += 0.02;
        return;
      }
      case 3: {
        const fov = THREE.MathUtils.degToRad(this.stage.camera.fov);
        const k = 2 * Math.tan(fov / 2);
        const bw = 2 * b.L + 2 * b.W + b.g;
        const bh = b.H + b.W;
        const aspect = this.stage.camera.aspect;
        const wide = aspect > 1;
        const d = Math.max(bw / (k * aspect * (wide ? 0.5 : 0.92)), bh / (k * (wide ? 0.62 : 0.5)));
        const cy = b.fh + 0.25 + b.H / 2;
        out.target.set(0, cy, 0);
        out.pos.set(0, cy + d * 0.06, d);
        return;
      }
      case 4:
        return set(-6.4 * s, c.y + 4.2 * s, 9.4 * s, 0, c.y, 0);
      case 5: {
        // palette chargée de caisses à plat + caisse montée posée devant
        const h = this.stack.height;
        const k = Math.max(0.85, h / 13);
        const r = 36 * k;
        // caméra haute : on voit le dessus des paquets (caisses à plat imprimées) et les feuillards
        const tz = 2;
        return set(Math.sin(0.58) * r, h * 1.2 + 5 * k, tz + Math.cos(0.58) * r, 0.6, h * 0.42, tz);
      }
      // la gamme : travelling le long de la rangée (caisse + pizza, e-commerce + plateau,
      // plateau + croisillons), puis plan en enfilade pour l'engagement
      case 6:
        return gamme(-6.1, 0.9);
      case 7:
        return gamme(2.6, 0.6);
      case 8:
        return gamme(7.4, 0.9);
      case 9:
        return set(23.5, 9.4, 17, 3.2, 0.6, -0.6);
      default:
        return set(8, 5, 10, 0, 1.5, 0);
    }
  }

  /** Plans caméra du monde « macro » (mm). */
  macroKey(i, out) {
    const keys = [
      [V(2.4, 2.6, 28), V(0, 0.2, 15)],
      [V(-36, 30, 74), V(2, 1, 0)],
      [V(20, 9, 66), V(2, 0, 6)],
      [V(34, 60, 80), V(0, 5, 0)],
    ];
    const k = keys[Math.min(keys.length - 1, i)];
    out.pos.copy(k[0]).sub(k[1]).multiplyScalar(i === 0 ? 1 : this.fitFactor).add(k[1]);
    out.target.copy(k[1]);
  }

  _interp(fn, x, pos, target) {
    const i = Math.floor(x);
    const t = x - i;
    const a = { pos: tmpA, target: tmpB };
    fn.call(this, i, a);
    if (t < 1e-4) {
      pos.copy(a.pos);
      target.copy(a.target);
      return;
    }
    const pa = a.pos.clone();
    const ta = a.target.clone();
    const b = { pos: tmpA, target: tmpC };
    fn.call(this, i + 1, b);
    const e = t * t * (3 - 2 * t);
    pos.lerpVectors(pa, b.pos, e);
    target.lerpVectors(ta, b.target, e);
  }

  // ------------------------------------------------------------ récit
  applyStory(st, time, mobile) {
    const { stage, box, board, stack, lineup } = this;
    const macro = st.world > 0.5;
    stage.world = macro ? 'macro' : 'box';
    stage.setShift(mobile ? 0 : st.shiftX, mobile ? -0.16 : 0);
    this.fitFactor = this._fit(mobile);

    const pos = new THREE.Vector3();
    const target = new THREE.Vector3();

    if (!macro) {
      box.params.lid = st.lid;
      box.params.flat = st.flat;
      box.params.tape = st.tape;
      box.update();
      box.group.rotation.set(0, st.rotY + st.idle * 0.28 * Math.sin(time * 0.45), 0);

      // palettisation : caisses livrées à plat ; la caisse montée glisse devant la palette
      stack.update(st.stack);
      // la gamme : la palette laisse place aux autres produits (changement sous le voile)
      const range = st.range > 0.5;
      lineup.group.visible = range;
      box.group.visible = true;
      this.diecut.group.visible = false;
      stage.setShadowSpan(range ? 1.35 : 1);
      if (range) {
        stack.group.visible = false;
        lineup.update({ open: st.rangeOpen, fill: st.rangeFill, build: st.rangeBuild });
        box.group.position.copy(lineup.boxSlot.pos);
        box.group.rotation.set(0, lineup.boxSlot.rotY, 0);
      } else if (st.stack > 0.001 && stack.heroSpot) {
        const k = smooth(0, 0.25, st.stack);
        const hs = stack.heroSpot;
        box.group.position.set(lerp(0, hs.x, k), 0, lerp(0, hs.z, k));
      } else box.group.position.set(0, 0, 0);

      this._interp(this.boxKey, st.camBox, pos, target);
      stage.look(pos, target, 0.004);
    } else {
      const fi = Math.min(FLUTE_STORY.length - 1, Math.max(0, st.flute));
      const i0 = Math.floor(fi);
      const i1 = Math.min(FLUTE_STORY.length - 1, i0 + 1);
      board.setState({ from: FLUTE_STORY[i0], to: FLUTE_STORY[i1], t: fi - i0, explode: st.explode });
      this._applyEct(st.ect);
      this._interp(this.macroKey, st.camMacro, pos, target);
      stage.look(pos, target, 0.05);
    }
  }

  _applyEct(p) {
    const { board } = this;
    const rot = smooth(0, 0.35, p);
    const press = smooth(0.35, 0.8, p);
    const squash = smooth(0.8, 1, p);
    // l'échantillon pivote pour dresser les cannelures à la verticale
    board.group.rotation.x = (-Math.PI / 2) * rot;
    board.group.scale.z = 1 - 0.035 * squash;
    const half = 15 * board.group.scale.z;
    this.rig.visible = p > 0.3;
    this.plateBottom.position.y = -half - 1.2;
    this.plateTop.position.y = lerp(half + 26, half + 1.2, press);
    this.arrow.position.y = this.plateTop.position.y + 1.2;
    this.arrow.scale.setScalar(0.4 + 0.6 * press);
  }

  _fit(mobile) {
    const a = this.stage.camera.aspect;
    return mobile ? Math.max(1, 0.9 / a) : Math.max(1, 1.45 / a);
  }

  // ------------------------------------------------------------ configurateur
  /** Sujet du configurateur : la caisse (caisses, plaques) ou le modèle de découpe (DI / DV). */
  _subject(useDie) {
    return useDie && this.diecut.mats ? this.diecut : this.box;
  }

  enterConfig(controls, useDie = false) {
    const { stage, box, stack } = this;
    stage.world = 'box';
    stage.setShadowSpan(1);
    stack.update(0);
    this.lineup.group.visible = false;
    for (const m of [box, this.diecut]) {
      m.group.position.set(0, 0, 0);
      m.group.rotation.set(0, 0, 0);
    }
    this.fitFactor = this._fit(false);
    const subject = this._subject(useDie);
    const center = subject.center(new THREE.Vector3());
    const dir = new THREE.Vector3(0.62, 0.46, 0.9).normalize();
    stage.camera.position.copy(center).addScaledVector(dir, this._configDistance(0.55, 0.9, subject));
    controls.target.copy(center);
    controls.update();
  }

  /** Distance caméra pour que le sujet tienne dans la zone d'aperçu. */
  _configDistance(fracW = 1, fracH = 1, subject = this.box) {
    const b = subject;
    const cam = this.stage.camera;
    const k = 2 * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2);
    const fit = (w, h) => Math.max(w / (k * cam.aspect * Math.max(0.2, fracW)), h / (k * Math.max(0.2, fracH)));
    if (b === this.diecut) {
      const d = 2 * b.radius();
      return fit(d * 1.02, d * 0.92);
    }
    if (b.family === 'plaque') return fit(b.L * 1.15, b.W * 1.4);
    const flatK = smooth(0.3, 1, b.params.flat);
    const lidK = smooth(0, 0.6, b.params.lid) * (1 - flatK);
    const folded = Math.hypot(b.L, b.W, b.H + b.fh * lidK) * 1.3;
    const needW = lerp(folded, (2 * b.L + 2 * b.W + b.g) * 1.1, flatK);
    const needH = lerp(folded, (b.H + b.W) * 1.3, flatK);
    return fit(needW, needH);
  }

  applyConfig(cfg, controls, dt, useDie = false) {
    const { stage, box } = this;
    stage.world = 'box';
    stage.setShift(cfg.shiftX, cfg.shiftY);
    this.stack.group.visible = false;
    this.lineup.group.visible = false;
    const subject = this._subject(useDie);
    box.group.visible = subject === box;
    this.diecut.group.visible = subject !== box;
    if (subject !== box) return this._applyDieConfig(cfg, controls, dt);
    // caisse : ouverture / mise à plat réglables ; découpe : flan à plat ; plaque : feuille
    const isCase = box.family === 'caisse';
    const lid = isCase ? cfg.lid : 0;
    const flat = isCase ? cfg.flat : 1;
    box.params.lid = lid;
    box.params.flat = flat;
    box.params.tape = isCase && lid < 0.02 && flat < 0.02 ? 1 : 0;
    box.update();
    box.group.position.set(0, 0, 0);
    if (cfg.autoRotate) cfg.angle += dt * 0.35;
    // à plat, le flan se présente de face
    const flatK = smooth(0.3, 1, flat);
    const a = Math.atan2(Math.sin(cfg.angle), Math.cos(cfg.angle));
    box.group.rotation.set(0, a * (1 - flatK), 0);

    const center = box.center(tmpA);
    this._frame(controls, center, flatK, tmpC.set(0, 0.12, 1).normalize(), this._configDistance(cfg.fracW, cfg.fracH));
  }

  /** Découpes : boîte pizza, e-commerce, plateau, croisillons. */
  _applyDieConfig(cfg, controls, dt) {
    const m = this.diecut;
    const st = m.style;
    m.params.lid = st.lid ? cfg.lid : 0;
    m.params.flat = st.noFlat ? 0 : cfg.flat;
    m.params.fill = 1;
    m.update();
    m.group.position.set(0, 0, 0);
    if (cfg.autoRotate) cfg.angle += dt * 0.35;
    // à plat, le plan de découpe se présente vu de dessus
    const flatK = smooth(0.3, 1, m.params.flat);
    const a = Math.atan2(Math.sin(cfg.angle), Math.cos(cfg.angle)) * (1 - flatK);
    m.group.rotation.set(0, a, 0);
    const center = m.center(tmpA).applyAxisAngle(Y, a);
    this._frame(controls, center, flatK, m.flatViewDir, this._configDistance(cfg.fracW, cfg.fracH, m));
  }

  /** Recentre la cible, approche la distance voulue et oriente la vue « à plat ». */
  _frame(controls, center, flatK, flatDir, dist) {
    const cam = this.stage.camera;
    controls.target.lerp(center, 0.12);
    const off = tmpB.copy(cam.position).sub(controls.target);
    const len = off.length();
    if (flatK > 0) off.normalize().lerp(flatDir, flatK * 0.12);
    off.setLength(lerp(len, dist, 0.1));
    cam.position.copy(controls.target).add(off);
    controls.update();
    const d = cam.position.distanceTo(controls.target);
    cam.near = Math.max(0.01, d * 0.02);
    cam.far = d * 40;
    cam.updateProjectionMatrix();
  }
}
