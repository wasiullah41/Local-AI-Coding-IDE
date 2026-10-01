import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Relative base so the packaged Electron app can load the bundle from file://
  base: './',
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    sourcemap: true,
    // Monaco and xterm are large, but they are lazily loaded vendor chunks, so
    // the default 500 kB warning is only noise here.
    chunkSizeWarningLimit: 5000,
    // The language workers are real chunks, and source maps for them add ~28 MB
    // of work for code that is only ever read inside a worker.
    worker: {
      rollupOptions: {
        output: { sourcemap: false },
      },
    },
    rollupOptions: {
      output: {
        // Monaco and xterm are large and change rarely, so they are split out
        // instead of shipping as one bundle the renderer must parse on boot.
        // Matching on the resolved path works whether or not the package is a
        // direct dependency.
        manualChunks(id) {
          // `?worker` entries are emitted as standalone worker chunks that
          // Monaco loads on demand. Folding them into the shared monaco chunk
          // would inline the 7 MB TypeScript worker into the renderer graph
          // and can exhaust the build heap, so they are left to Vite.
          if (id.includes('?worker')) return undefined;
          if (id.includes('node_modules/monaco-editor')) return 'monaco';
          if (id.includes('node_modules/@xterm')) return 'xterm';
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
            return 'react';
          }
          return undefined;
        },
      },
    },
  },
});
