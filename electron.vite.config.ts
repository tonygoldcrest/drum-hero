import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  main: {
    // @ts-expect-error — watch is valid at runtime but missing from BuildEnvironmentOptions in Vite 6 types
    build: { externalizeDeps: true, watch: {} },
  },
  preload: {
    build: { externalizeDeps: true },
  },
  renderer: {
    plugins: [tailwindcss(), react()],
  },
});
