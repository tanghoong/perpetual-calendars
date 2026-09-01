import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// GitHub Pages serves this project site from a subpath, so built asset URLs
// have to carry that prefix or they 404. CI passes the repository's real base
// path in BASE_PATH (see .github/workflows/deploy.yml), which keeps forks and
// renames working without a code edit; the literal is the local fallback.
// `||` rather than `??` on purpose: an unset step output arrives as '', not
// undefined, and an empty base would emit root-relative URLs.
const rawBase = process.env.BASE_PATH || '/perpetual-calendars/'
const base = rawBase.endsWith('/') ? rawBase : `${rawBase}/`

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base,
})
