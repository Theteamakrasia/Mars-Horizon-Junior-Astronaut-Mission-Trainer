import { defineConfig } from 'vite';

export default defineConfig({
  // The astronaut PNG lives in `Assets/images/` and is imported from TypeScript so
  // Vite fingerprints it and only emits the assets we actually reference. The
  // default `public/` dir is disabled so the large `Assets/README_ref/` mockups
  // are never copied into `dist/`.
  publicDir: false,

  // Relative base so a built `dist/` can be opened straight from the filesystem.
  base: './',

  build: {
    target: 'es2020',
    outDir: 'dist',
    emptyOutDir: true,
  },
});
