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

// Open Graph and Twitter card images must be absolute URLs — crawlers fetch
// them out of page context and will not resolve a relative path — so `base` is
// not enough. CI supplies the full origin from the same configure-pages step
// that supplies BASE_PATH; the literal is the local fallback, matching
// package.json's `homepage`. Trailing slash stripped so the template can own it.
const siteUrl = (process.env.SITE_URL || 'https://tanghoong.github.io/perpetual-calendars/').replace(
  /\/+$/,
  '',
)

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      // index.html carries %SITE_URL% wherever an absolute URL is required.
      // A plugin rather than Vite's built-in `%VITE_*%` substitution because
      // this value comes from the CI environment, not from a .env file.
      name: 'inject-site-url',
      transformIndexHtml: (html: string) => html.replaceAll('%SITE_URL%', siteUrl),
    },
  ],
  base,
})
