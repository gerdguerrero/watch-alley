import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// Solo pre-launch project — direct push to master after each verified unit.
// Multi-page build: every .html at the project root becomes a routable page in dist/.
//
// /admin clean URL:
// - Production (Vercel): handled automatically by Vercel's clean-URLs rule
//   (it serves dist/admin/index.html for /admin).
// - Vite dev: by default /admin (no trailing slash) falls through to SPA
//   index.html. A tiny middleware below rewrites /admin → /admin/ so the
//   dev-server experience matches production.
function adminCleanUrl() {
  return {
    name: 'admin-clean-url',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url === '/admin') {
          req.url = '/admin/';
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [adminCleanUrl()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        authenticity: resolve(__dirname, 'authenticity.html'),
        terms: resolve(__dirname, 'terms.html'),
        privacy: resolve(__dirname, 'privacy.html'),
        admin: resolve(__dirname, 'admin/index.html'),
        journal: resolve(__dirname, 'journal.html'),
        journalSeikoLE: resolve(__dirname, 'journal/seiko-launches-5th-philippine-limited-edition.html'),
        journalOmega75: resolve(__dirname, 'journal/omega-marks-75-years-of-the-seamaster.html'),
        journalMoonSwatch: resolve(__dirname, 'journal/moonswatch-resale-cools-time-to-buy.html'),
      },
    },
  },
});
