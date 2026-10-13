import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/**
 * Deux « mondes » partagent le même renderer et la même caméra :
 *  - boxScene   : la caisse à l'échelle (1 unité = 100 mm)
 *  - macroScene : l'échantillon de carton en coupe (1 unité = 1 mm)
 */
export class Stage {
  constructor(canvas) {
    const coarse = matchMedia('(pointer: coarse)').matches;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, coarse ? 1.5 : 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.setClearColor(0x000000, 0);

    this.camera = new THREE.PerspectiveCamera(35, 1, 0.01, 400);
    this.shift = { x: 0, y: 0 };

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    // ---- Monde « caisse »
    this.boxScene = new THREE.Scene();
    this.boxScene.environment = env;
    this.boxScene.environmentIntensity = 0.55;
    const hemi = new THREE.HemisphereLight(0xfff3e0, 0x8a7560, 0.9);
    this.boxScene.add(hemi);
    const key = new THREE.DirectionalLight(0xfff1dc, 2.4);
    key.position.set(8, 16, 10);
    key.castShadow = true;
    key.shadow.mapSize.set(coarse ? 1024 : 2048, coarse ? 1024 : 2048);
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.02;
    key.shadow.radius = 5;
    const sc = key.shadow.camera;
    sc.left = -12;
    sc.right = 12;
    sc.top = 16;
    sc.bottom = -8;
    sc.near = 1;
    sc.far = 50;
    this.boxScene.add(key);
    const fill = new THREE.DirectionalLight(0xdfe8ff, 0.6);
    fill.position.set(-10, 6, -4);
    this.boxScene.add(fill);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 80),
      new THREE.ShadowMaterial({ color: 0x3a2716, opacity: 0.2 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.005;
    ground.receiveShadow = true;
    this.boxScene.add(ground);

    // ---- Monde « macro »
    this.macroScene = new THREE.Scene();
    this.macroScene.environment = env;
    this.macroScene.environmentIntensity = 0.35;
    this.macroScene.add(new THREE.HemisphereLight(0xfff0dc, 0x1a120b, 0.7));
    const mKey = new THREE.DirectionalLight(0xffe7c4, 2.6);
    mKey.position.set(30, 60, 50);
    this.macroScene.add(mKey);
    const rim = new THREE.DirectionalLight(0xffa860, 2.2);
    rim.position.set(-60, 20, -40);
    this.macroScene.add(rim);
    const front = new THREE.PointLight(0xfff4e6, 520, 0, 2);
    front.position.set(0, 10, 45);
    this.macroScene.add(front);

    this.world = 'box';
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.size = { w, h };
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.applyShift();
  }

  /** Déplace le centre du rendu (fraction d'écran : x > 0 vers la droite, y > 0 vers le bas). */
  setShift(x, y) {
    if (Math.abs(x - this.shift.x) < 1e-4 && Math.abs(y - this.shift.y) < 1e-4) return;
    this.shift.x = x;
    this.shift.y = y;
    this.applyShift();
  }

  applyShift() {
    const { w, h } = this.size;
    const ox = -this.shift.x * w;
    const oy = -this.shift.y * h;
    if (Math.abs(ox) < 0.5 && Math.abs(oy) < 0.5) this.camera.clearViewOffset();
    else this.camera.setViewOffset(w, h, ox, oy, w, h);
    this.camera.updateProjectionMatrix();
  }

  /** Place la caméra et ajuste near/far à la distance de visée (précision du Z-buffer). */
  look(pos, target, minNear = 0.004) {
    this.camera.position.copy(pos);
    this.camera.lookAt(target);
    const d = pos.distanceTo(target);
    const near = Math.max(minNear, d * 0.02);
    if (Math.abs(near - this.camera.near) / this.camera.near > 0.05) {
      this.camera.near = near;
      this.camera.far = Math.max(60, d * 40);
      this.camera.updateProjectionMatrix();
    }
  }

  render() {
    this.renderer.render(this.world === 'macro' ? this.macroScene : this.boxScene, this.camera);
  }

  /**
   * Capture PNG transparente, centrée (sans le décalage de mise en page).
   * L'image est copiée tout de suite après le rendu ; l'encodage PNG (toBlob) est asynchrone.
   * @returns {Promise<Blob|null>}
   */
  capture() {
    const { x, y } = this.shift;
    this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
    this.render();
    const blob = new Promise((resolve) => this.renderer.domElement.toBlob(resolve, 'image/png'));
    this.shift.x = this.shift.y = -1;
    this.setShift(x, y);
    return blob;
  }
}
