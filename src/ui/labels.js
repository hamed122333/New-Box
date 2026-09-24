import * as THREE from 'three';

/**
 * Étiquettes HTML accrochées à des points 3D (projection écran à chaque image).
 * Chaque élément `[data-anchor]` du conteneur est associé à une ancre de l'échantillon.
 */
export class Labels {
  constructor(container, board, camera) {
    this.container = container;
    this.board = board;
    this.camera = camera;
    this.items = [...container.querySelectorAll('[data-anchor]')].map((el) => ({
      el,
      anchor: el.dataset.anchor,
      order: parseFloat(el.dataset.order || '0'),
      side: el.classList.contains('label--left') ? 'left' : 'right',
      width: 0,
    }));
    this.v = new THREE.Vector3();
    window.addEventListener('resize', () => this.items.forEach((it) => (it.width = 0)));
  }

  update(visibility, size) {
    const on = visibility > 0.001;
    this.container.style.visibility = on ? 'visible' : 'hidden';
    if (!on) return;
    const { w, h } = size;
    for (const it of this.items) {
      this.board.anchorWorld(it.anchor, this.v).project(this.camera);
      const x = (this.v.x * 0.5 + 0.5) * w;
      const y = (-this.v.y * 0.5 + 0.5) * h;
      // l'étiquette change de côté si elle sortirait de l'écran
      if (!it.width) it.width = it.el.offsetWidth;
      let side = it.side;
      if (side === 'right' && x + it.width > w - 8) side = 'left';
      else if (side === 'left' && x - it.width < 8) side = 'right';
      it.el.classList.toggle('label--left', side === 'left');
      // apparition échelonnée
      const k = Math.min(1, Math.max(0, visibility * 1.6 - it.order * 0.15));
      it.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      it.el.style.opacity = k.toFixed(3);
    }
  }
}
