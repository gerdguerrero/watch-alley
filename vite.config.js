import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// Solo pre-launch project — direct push to master after each verified unit.
// Multi-page build: every .html at the project root becomes a routable page in dist/.

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        authenticity: resolve(__dirname, 'authenticity.html'),
        terms: resolve(__dirname, 'terms.html'),
        privacy: resolve(__dirname, 'privacy.html'),
      },
    },
  },
});
