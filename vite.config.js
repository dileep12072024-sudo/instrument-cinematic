import { defineConfig } from 'vite';
export default defineConfig({
  server: { watch: { usePolling: true, interval: 750 } },
  build: { rollupOptions: { output: { manualChunks: { three: ['three', 'three/addons/controls/OrbitControls.js', 'three/addons/loaders/HDRLoader.js', 'three/addons/utils/BufferGeometryUtils.js'] } } } },
});
