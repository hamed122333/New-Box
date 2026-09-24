import { defineConfig } from 'vite';

// base relative : le build fonctionne dans n'importe quel sous-dossier
// (ex. https://newbox.com.tn/experience/) sans reconfiguration.
export default defineConfig({
  base: './',
  // localhost uniquement (pas d'alerte du pare-feu Windows) ; `npm run dev:lan` pour tester sur mobile
  server: { port: 5173 },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three')) return 'three';
          if (id.includes('node_modules/gsap') || id.includes('node_modules/lenis')) return 'motion';
        },
      },
    },
  },
});
