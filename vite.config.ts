import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves this project site from /perpetual-calendars/, so the
  // built asset URLs have to carry that prefix or they 404.
  base: '/perpetual-calendars/',
})