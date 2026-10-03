import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    // The whole UI (index.html, static assets and TypeScript sources) lives in
    // src/main/frontend, mirroring how the Java backend is grouped under
    // src/main/java. The build output stays at the repository root so the
    // Express server and the Dockerfile keep resolving ./dist unchanged.
    root: path.resolve(__dirname, 'src/main/frontend'),
    publicDir: path.resolve(__dirname, 'src/main/frontend/public'),
    build: {
      outDir: path.resolve(__dirname, 'dist'),
      emptyOutDir: true,
    },
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
