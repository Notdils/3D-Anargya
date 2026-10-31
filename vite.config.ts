import { defineConfig } from "vite";
import { resolve } from "node:path";

// Dua halaman: landing (index.html) dan minigame (game.html)
export default defineConfig({
  build: {
    chunkSizeWarningLimit: 700, // three.js ±500 kB (130 kB gzip)
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        game: resolve(__dirname, "game.html"),
      },
    },
  },
});
