import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, posix, relative, sep } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
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

/** Every file under `public/`, as the paths they are served at. */
const publicFiles = (dir: string, root = dir): string[] =>
  readdirSync(dir).flatMap(entry => {
    const full = join(dir, entry)
    return statSync(full).isDirectory()
      ? publicFiles(full, root)
      : [relative(root, full).split(sep).join(posix.sep)]
  })

/**
 * Generates a service worker that precaches the whole build.
 *
 * Hand-written rather than `vite-plugin-pwa`, which would pull Workbox in to
 * solve problems this app does not have: there is no API, no runtime data and
 * no route it does not already ship. Everything it needs is known at build
 * time, so the whole strategy is "cache all of it on install, serve from cache,
 * drop the previous cache on activate".
 *
 * Offline was never blocked by the app needing the network *after* load — it
 * does not. It was blocked by the browser having to fetch the app itself first,
 * which nothing can skip without a service worker saying so.
 */
const CACHE_PREFIX = 'one-page-calendar-'

const serviceWorker = (): Plugin => ({
  name: 'service-worker',
  apply: 'build',
  // writeBundle, not generateBundle: index.html is not in the bundle when this
  // plugin runs, and the cache version has to be taken from the bytes actually
  // served. By writeBundle everything is on disk, so it can be read for real.
  writeBundle(options, bundle) {
    const outDir = options.dir ?? 'dist'
    // Content-hashed, so their names already encode their contents.
    const hashed = Object.keys(bundle)
    // Stable names, so their contents have to be hashed explicitly.
    const stable = ['index.html', ...publicFiles('public')]

    // Stable order, so an unchanged build produces an unchanged cache name and
    // returning visitors are not handed a pointless re-download.
    const urls = [...new Set(['', ...stable, ...hashed].map(p => base + p))].sort()

    // Hashing the URL list alone was not enough, and the gap was invisible from
    // the outside: index.html and everything in public/ keep the same filename
    // across builds, so editing a meta tag, the manifest or an icon produced a
    // byte-identical URL list, an identical cache name, and therefore a returning
    // visitor pinned to the old copy forever — activate only drops caches whose
    // name differs. Hashing the served bytes closes it.
    const hash = createHash('sha256').update(urls.join('\n')).update(base).update(siteUrl)
    for (const file of [...stable, ...hashed]) hash.update(readFileSync(join(outDir, file)))
    const version = hash.digest('hex').slice(0, 12)

    // The app cannot run without these, so they install atomically: addAll
    // rejects as a unit, which fails the install and leaves the previous worker
    // and its cache in place. The rest are nice to have offline and must not be
    // able to take the whole install down with them.
    const required = [...new Set(['', 'index.html', ...hashed].map(p => base + p))].sort()
    const optional = urls.filter(u => !required.includes(u))

    writeFileSync(
      join(outDir, 'sw.js'),
      `// Generated at build time by vite.config.ts. Do not edit.
const CACHE = '${CACHE_PREFIX}${version}';
const SHELL = ${JSON.stringify(base)};
const REQUIRED = ${JSON.stringify(required, null, 2)};
const OPTIONAL = ${JSON.stringify(optional, null, 2)};

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache =>
      // Atomic: if any of these fails, the install fails, and the worker already
      // serving this app keeps its cache. Swallowing the failure here would
      // replace a working offline copy with an empty one.
      cache
        .addAll(REQUIRED)
        .then(() => Promise.allSettled(OPTIONAL.map(url => cache.add(url))))
        .then(() => self.skipWaiting()),
    ),
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      // Only this app's caches. On a project-site origin like
      // <user>.github.io, every other project the same account publishes is a
      // same-origin neighbour sharing one CacheStorage, and deleting every key
      // would wipe theirs on our first visit.
      .then(keys =>
        Promise.all(
          keys.filter(k => k.startsWith('${CACHE_PREFIX}') && k !== CACHE).map(k => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Every view of this app is the same document with a different query string,
  // so a navigation is always answered by the one cached shell. That is what
  // makes a shared ?y=&m=&d= link open offline too.
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match(SHELL).then(cached => cached || fetch(request)),
    );
    return;
  }

  // Assets are content-hashed, so a hit is never stale. A miss goes to the
  // network and is not written back: anything worth caching was precached, and
  // caching the rest would grow without bound.
  event.respondWith(caches.match(request).then(cached => cached || fetch(request)));
});
`,
    )
  },
})

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
    serviceWorker(),
  ],
  base,
})
