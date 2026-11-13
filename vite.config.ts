import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { defineConfig } from 'vite';

/**
 * Build: `npm run build` writes the app to dist/ together with everything in public/
 * (the PHP API, installer and .htaccess). Upload/deploy the contents of dist/.
 *
 * Local development: run the PHP side with `php -S 127.0.0.1:8080 -t dist dist/router.php`
 * after a build, or point PHP_DEV at any PHP server; Vite forwards /api and images to it.
 */
const phpDev = process.env.PHP_DEV || 'http://127.0.0.1:8080';

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': phpDev,
      '/storage': phpDev,
      '/uploads': phpDev,
      '/manifest.json': phpDev,
      '/push-worker.js': phpDev,
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
    dedupe: ['react', 'react-dom', 'react-router'],
  },
  plugins: [tailwindcss(), react()],
  build: { assetsInlineLimit: 100000 },
});
