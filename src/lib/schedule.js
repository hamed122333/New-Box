/**
 * Exécute `fn` juste après le prochain affichage : le retour visuel d'un clic est peint
 * immédiatement, le travail lourd (textures, géométrie) vient ensuite. C'est ce délai
 * « interaction → image suivante » que mesure l'INP (Interaction to Next Paint).
 */
export function afterNextPaint(fn) {
  requestAnimationFrame(() => setTimeout(fn, 0));
}

/**
 * Termine la tâche en cours et reprend dans une nouvelle : découpe un long calcul de
 * chargement en étapes courtes (scheduler.yield si disponible, sinon setTimeout).
 */
export const yieldToMain = () =>
  globalThis.scheduler?.yield ? globalThis.scheduler.yield() : new Promise((r) => setTimeout(r, 0));
