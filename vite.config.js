import { defineConfig } from 'vite';
export default defineConfig({
  // Merges go through src/merge-pieces.js, which can tag each merged piece for the building's rise (src/rise.js).
  resolve: { alias: [{ find: /^three\/addons\/utils\/BufferGeometryUtils\.js$/, replacement: new URL('./src/merge-pieces.js', import.meta.url).pathname }] },
  server: { watch: { usePolling: true, interval: 750 } },
  // two pages: the story (index.html, pre-rendered frames: src/story.js) and the live campus (campus/index.html: src/main.js)
  build: { rollupOptions: { input: { story: new URL('./index.html', import.meta.url).pathname, campus: new URL('./campus/index.html', import.meta.url).pathname }, output: { manualChunks: { three: ['three', 'three/addons/controls/OrbitControls.js', 'three/addons/loaders/HDRLoader.js', 'three/examples/jsm/utils/BufferGeometryUtils.js'] } } } },
});
