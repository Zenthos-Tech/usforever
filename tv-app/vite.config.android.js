import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'
import fs from 'fs'

const buildId = Date.now().toString()

export default defineConfig({
  plugins: [
    react(),
    viteSingleFile(),
    {
      name: 'write-build-txt',
      closeBundle() {
        fs.writeFileSync('android-tv-wrapper/build.txt', buildId)
      },
    },
  ],
  base: './',
  define: {
    'import.meta.env.VITE_BUILD_ID': JSON.stringify(buildId),
  },
  build: {
    outDir: 'android-tv-wrapper',
    emptyOutDir: false,
    target: 'es2015',
  },
})
