/**
 * Exécute `fn` juste après le prochain affichage : le retour visuel d'un clic est peint
 * immédiatement, le travail lourd (textures, géométrie) vient ensuite. C'est ce délai
 * « interaction → image suivante » que mesure l'INP (Interaction to Next Paint).
 */
export function afterNextPaint(fn) {
  requestAnimationFrame(() => setTimeout(fn, 0));
}
