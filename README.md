# One Page Calendar

A whole year on a single grid. No 12 month-blocks, no scrolling, no reprinting every January.

A conventional calendar spends 12 separate grids to encode one fact per date: *which weekday is it?* This app encodes the same year in **one 7×12 lookup table** — find the month's column, find the date's row, read the weekday where they cross. Change the year and only the month labels move; the rest of the grid never changes, because it can't.

And the month labels only move fourteen ways. **There are exactly fourteen arrangements they can take** — seven for common years, seven for leap years — so every year is one of fourteen, and two years of the same type render an identical grid. That is what makes this a *perpetual* calendar rather than a one-page annual one, and the page now says so: under the grid is the list of years the sheet in front of you is equally valid for.

Where this is going: [docs/DIRECTION.md](docs/DIRECTION.md).

Built with React 19, TypeScript 5, Vite 8 and Tailwind CSS 4, styled to iOS. Fully client-side: no backend, no date library, and **no runtime dependencies at all** beyond React — just modular arithmetic, `Intl`, and hand-drawn SVG.

![The calendar on a desktop viewport with 25 December selected: months grouped into seven columns by the weekday they start on, dates 1-31 in a block to the left, a 7x7 weekday grid lighting the Dec column and the 25th row with Friday at their crossing, and a strip below listing the eleven years that share this exact grid](docs/one-page-calendar.png)

![The same lookup in dark mode on a phone viewport: the grid on black with iOS dark-appearance systemBlue, the language segmented control showing a lifted thumb, and the same-grid year strip beneath](docs/one-page-calendar-dark.png)

<p align="center">
  <img src="docs/one-page-calendar-mobile.png" alt="The calendar in Chinese on a 390px phone viewport, with the How to read it explainer expanded, upright and fully legible" width="330">
  <br>
  <em>In Chinese at 390px, with the explainer open — upright, no rotation, no horizontal scroll.</em>
</p>

---

## The problems it solves

**1. "What weekday is the 25th?" costs a scroll and a scan.**
On a normal calendar you have to find the right month block, then visually walk the grid. Here it is one intersection: two coordinates, one cell.

**2. A year needs twelve grids — and next year needs twelve more.**
Each month block is 90% redundant with the others. This layout factors that redundancy out: the date block and weekday block are *year-invariant*, and only the 12 month labels re-flow when the year changes. That is why a single page works as a perpetual calendar.

**3. Cross-month patterns are invisible on a normal calendar.**
Months that start on the same weekday have byte-identical layouts — but on a normal calendar they sit pages apart, so you never notice. Here they literally stack in the same column. "Which months start on a Monday?" becomes a glance, not an audit. Useful for recurring schedules, shift rosters, and "same day next month" planning.

**4. Wall calendars don't fit a screen, a wallet, or a sidebar.**
The entire year is roughly a 12×7 table. It fits a phone screen, a business card, or a corner of a whiteboard.

**5. Mixed-language teams keep separate calendars.**
Month and weekday labels switch between **English / 中文 / Melayu / Tiếng Việt** without touching the layout — the grid is the same object in any language.

---

## How to read it

```
                     ┌─────┬─────┬─────┬─────┬─────┬─────┬─────┐
                     │ Feb │ Jun │ Sep │ Apr │ Jan │ May │ Aug │   ← months, dropped into the
                     │ Mar │     │ Dec │ Jul │ Oct │     │     │     column of the weekday
                     │ Nov │     │     │     │     │     │     │     they start on
 ┌───┬───┬───┬───┬───┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤
 │ 1 │ 8 │15 │22 │29 │ Sun │ Mon │ Tue │ Wed │ Thu │ Fri │ Sat │
 │ 2 │ 9 │16 │23 │30 │ Mon │ Tue │ Wed │ Thu │ Fri │ Sat │ Sun │
 │ 3 │10 │17 │24 │31 │ Tue │ Wed │ Thu │ Fri │ Sat │ Sun │ Mon │
 │ 4 │11 │18 │25 │   │ Wed │ Thu │ Fri │ Sat │ Sun │ Mon │ Tue │
 │ 5 │12 │19 │26 │   │ Thu │ Fri │ Sat │ Sun │ Mon │ Tue │ Wed │
 │ 6 │13 │20 │27 │   │ Fri │ Sat │ Sun │ Mon │ Tue │ Wed │ Thu │
 │ 7 │14 │21 │28 │   │ Sat │ Sun │ Mon │ Tue │ Wed │ Thu │ Fri │
 └───┴───┴───┴───┴───┴─────┴─────┴─────┴─────┴─────┴─────┴─────┘
   dates 1–31                      each row is the week rotated by one
```

*(month placement shown for 2026)*

**Three steps:**

1. Find your **month** in the header → note its **column**.
2. Find your **date** in the left block → note its **row**.
3. The weekday cell at that **row × column** is your answer.

**Worked example — 25 December 2026.**
`Dec` sits in the **Tue** column (3rd). `25` sits in **row 4**. Row 4 × column 3 → **Fri**. December 25, 2026 is a Friday.

**Why it works.** For a month whose 1st falls on weekday `f`, the weekday of date `d` is `(f + d − 1) mod 7`. The layout splits that sum into two axes: the month column contributes `f`, the date row contributes `(d − 1) mod 7`, and row `r` of the weekday block is the week rotated left by `r` — so cell `[r][f]` holds exactly `weekdays[(f + r) mod 7]`. The `mod 7` on the date axis is why 1, 8, 15, 22, 29 share a row: they are the same weekday, always.

---

## Features

| | |
|---|---|
| **Any year, one grid** | Step the year with ◀ / ▶, jump back with **Current Year**, or pick one of the same-grid years below. Only the month labels re-flow. |
| **Today, triangulated** | The current month, today's date, and the weekday cell where they intersect are all marked at once — with an outline, not a fill. A fill is what a selection uses, and the two mean different things: selecting the 13th used to put two identical blue squares on screen, one meaning *the answer* and one meaning *today*. |
| **Crosshair tracing** | Hover or tap any weekday cell and it lights its full row and column — plus the matching months above and the matching dates to the left. The cells are square and the grids have no gaps, so a lit row and column read as one continuous band meeting at a single filled square, rounded at its four outer tips and square everywhere the arms cross. That is the relationship the layout encodes, drawn rather than implied; circles could only ever meet at a point. |
| **Tap to pin** | On touch devices a tap pins the crosshair until you tap again or press **Clear**, so the lookup survives lifting your finger. Cells are also `<button>`s, so Enter works — and the weekday block is one tab stop with arrow keys inside it, not 49. |
| **31-day markers** | Months with 31 days are underlined, as is date `31` — a reminder that not every column runs to the bottom. The in-app explainer says so; it used to be documented only here, which is not where someone looking at the grid is. |
| **Elapsed dates dimmed, honestly** | In the current year, dates before today are greyed out — but only once a month is selected. The date block is shared by all 12 months, so a bare day-of-month comparison would dim the 3rd of December as readily as the 3rd of January; `isBeforeToday()` takes the month and returns `false` rather than guess when none is held. |
| **Sunday in red** | Marked in every one of the seven row rotations, so the weekend edge stays findable wherever it lands. |
| **4 languages** | **English / 中文 / Melayu / Tiếng Việt**, from a segmented control at the foot of the page or from `?lang=`. The control is a `<fieldset>` of real radio inputs, so it keeps native group semantics and native arrow-key navigation while looking like an iOS segmented control. It also sets `document.documentElement.lang`, which had been pinned to `en` while the page could already render all four. Month lengths and the Sunday column key off indices, not translated strings, so adding a language means adding one entry. |
| **Mobile first, literally** | The 320px layout is the one the sizes are derived from — at that width each weekday column gets ~21px, which sets the cell metric everything else scales up from. The row height then steps at `sm` and `lg` so the cell stays near-square as the container widens. Verified in-browser at 320/390/1024 in both appearances: zero horizontal overflow, measured, not assumed. |
| **Two layouts, one DOM** | One column on a phone; from `lg`, the controls move into a left rail and the grid takes the width that frees. Placement is grid areas rather than duplicated markup, so tab order and screen-reader order stay the reading order at both widths. |
| **Nothing moves** | The readout changes on every hover, and its companion line comes and goes. Both live in one height-reserved block, so no amount of pointer movement shifts anything below the heading. The reservations are measured, not guessed — 45/65/57px across the three breakpoints — and re-verified at 3 widths × 4 languages. |
| **Works backwards** | The point of the layout. Any two of month, date and weekday fix the third, and all three are selectable — so it answers *"which months is the 15th a Wednesday?"* and *"which days in September are Fridays?"*, not just *"what day is 2 September?"*. A stack of twelve month-grids can only answer those by checking twelve grids; here the answer is one lit column or row. |
| **The title is the answer** | The page heading is the lookup itself. With nothing selected it reads today in full — *Wednesday, 2 September 2026*. Select a cell and it names exactly what that cell denotes: *January 2026 · Sunday · 4, 11, 18, 25*. Rendered through `Intl`, so month names, weekday names and field order are right in all four locales rather than hand-assembled. |
| **Fast year jump** | The year in the stepper is a native `<select>` spanning ±60 years around the year on screen — on iOS that is the system wheel picker, so crossing decades is one gesture instead of forty taps. The window follows the selection rather than today, which is what lets the chevrons run all the way to 1583 and 9999 without the value ever falling outside its own option list. |
| **iOS design language** | Apple's published semantic colours (systemBlue, systemRed, the grouped backgrounds, the alpha label greys), SF Pro where it exists, fully rounded controls, and a segmented control for language. |
| **Light and dark** | Full dark appearance via `prefers-color-scheme`, driven entirely by CSS custom properties — not one `dark:` variant in the markup. |
| **No dependencies for the math, and no `Date` either** | Pure modular arithmetic — no moment, no date-fns, no timezone surprises, and no `new Date(y, m, 1).getDay()`, which silently answers for 1926 when asked about year 26. `Date` survives only for "today" and for `Intl` formatting. 44 tests check it against `Date` where `Date` is trustworthy and against the 400-year cycle where it is not, including the claim the whole UI rests on: the cell at (row of date, column of month) names that date's real weekday. |
| **SVG icons, inline** | The four glyphs are drawn to SF Symbols geometry in `icons.tsx`. No icon library, and stroke weights that match iOS rather than approximate it. |
| **One of fourteen** | The year is a fourth axis, reduced to its calendar type. A strip under the grid names the years sharing this exact arrangement — 2026 is the same sheet as 1981, 1987, 1998, 2009, 2015, 2037, 2043, 2054, 2065 and 2071 — alongside its traditional dominical letter. Every year listed puts *every* date on the same weekday, so the strip also answers *"which years is my birthday a Saturday?"*. |
| **1583 to 9999** | No sliding window. The arithmetic is pure modular math over the proleptic Gregorian calendar, with the year folded into 1..400 first, so it stays exact at any magnitude. 1583 is the first complete Gregorian year; claiming correctness before it would be a worse failure than refusing. |
| **One tab stop, not 49** | The 7×7 block is a real `role="grid"` with roving tabindex: arrows move inside it, and they wrap, which is honest rather than lazy — the block *is* a cyclic group. Page tab stops went from 99 to 76. |
| **Go to date** | A native `<input type="date">` drives the crosshair, so the iOS wheel and the Android calendar come for free and no locale needs a hand-written parser. It teaches the grid rather than replacing it. |
| **Shareable, visibly** | The URL has carried the whole view all along; now a button says so, offering the native share sheet where one exists and a clipboard copy everywhere else. |
| **Installable** | A web manifest with relative `start_url` and `scope`, real PNG icons including a maskable one, and a PNG `apple-touch-icon` — iOS refuses an SVG there and was silently using a screenshot. |
| **Prints** | `@media print` drops every control, forces the light palette (a dark-appearance reader would otherwise print white text on a background the printer drops), keeps the background fills — which *are* the answer, not decoration — and wraps the same-grid strip so the sheet states the years it is valid for. |
| **Explains itself** | *How to read it* carries the three steps, a worked example computed from the year on screen, what the underline means, and two lookups worth running — *Friday 13* and *1 Jan*, which used to sit on the main surface as shortcuts and were miscast there. Nobody arrives needing to know about Friday the 13th; it is a *demonstration* of the reverse lookup, and inside the explainer it reads as one. It opens for a reader arriving cold and stays closed for one arriving on a shared link — that link came with context, and its sender did not mean to send a tutorial. Derived from the URL rather than stored, so there is still nothing persisted anywhere. A `<details>`, not a guided tour: no motion, and nothing that can fight the no-layout-shift property above. |
| **Ragged edges face outward** | Two blocks come out uneven, and both are packed so the spare cells land on an outer edge instead of an inner one. Month columns hold one to three months and pack *down*, so the dense row sits against the weekday grid it labels rather than floating above a hole. The date block runs its columns *backwards* — 1-7 on the right, 29-31 on the left — so the four cells with no date sit at the block's far edge rather than forming a notch between the dates and the weekday grid. Every row is the same weekday whichever column you read it in, so the order costs nothing. |
| **Fewer ways to do the same thing** | A two-degree-of-freedom instrument had grown ten clusters of controls and six separate ways to set the year. *Current Year* is gone — the Today shortcut already resets the year, and names today's date while doing it. *Friday 13* and *1 Jan* moved into the explainer. Print moved up beside Share, the two ways this page leaves the screen, which leaves the footer holding nothing but the language. |
| **Every group says what it is** | `WEEKDAY`, `DATES`, `SHORTCUTS` and *Same grid as* are visible headings. The names always existed as `aria-label`s, so only a screen reader got them, which left a sighted reader facing three unlabelled rows of pills with no way to tell a filter from a shortcut. |
| **The grid is the slider** | Drag it sideways on a touch device and the year steps with your thumb. A physical perpetual calendar is a card with exactly one moving part, and that is also literally true here: the twelve month chips are the only things that move when the year changes, and the block beneath them never moves at all, because it cannot. So the grid *is* the slider, and until now the only way to push it was a stepper parked at the top of the page. Dragging teaches the perpetual claim by feel. |
| **All fourteen, at a glance** | Slide a physical instrument through every position and you see its whole vocabulary at once. That was the half this app was missing: a type could only be reached by already knowing a year of it. A collapsed panel now shows all fourteen as silhouettes — where the twelve chips fall across the seven columns, which is the only thing that distinguishes one type from another — each with its dominical letter and the nearest year that renders it. |
| **Static by construction** | No backend, no network calls, no storage. Builds to plain files; deploys to GitHub Pages. |

---

## Quick start

```bash
git clone https://github.com/tanghoong/perpetual-calendars.git
cd perpetual-calendars
npm install
npm run dev
```

Open <http://localhost:5173>.

Node 20.19 or newer is required — Vite 8 drops support for anything older.

### Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | `tsc -b && vite build` → `dist/` |
| `npm run preview` | Serve the production build locally, at the real base path |
| `npm run lint` | ESLint over the repo |
| `npm run typecheck` | TypeScript, no emit |
| `npm test` | Vitest over the date arithmetic |

`lint`, `typecheck` and `test` are the three commands CI runs before it will build, so a green local run is a green PR.

### Project layout

```
src/
  components/CalendarBuilder.tsx   ← layout, interaction, state
  components/icons.tsx             ← inline SF-Symbols-shaped SVG glyphs
  lib/calendar.ts                  ← the date arithmetic and the 14 calendar types, as pure functions
  lib/calendar.test.ts             ← 44 tests over it
  lib/i18n.ts                      ← the four translation tables
  lib/urlState.ts                  ← ?y=&lang=&m=&d=&w= round-tripping
  lib/format.ts                    ← cached Intl formatters
  index.css                        ← iOS semantic colour tokens, light + dark
  App.tsx                          ← renders CalendarBuilder
  main.tsx                         ← React root
public/icon.svg                    ← app icon / favicon
public/icon-*.png                  ← PWA icons, incl. maskable, + apple-touch-icon
public/manifest.webmanifest        ← makes it installable
public/og.png                      ← the 1200×630 link preview
dist/sw.js                         ← generated at build time; precaches the bundle
docs/DIRECTION.md                  ← where this is going, and the decisions still open
.github/workflows/deploy.yml       ← lint, typecheck, build, publish to Pages
.github/workflows/codeql.yml       ← CodeQL security analysis
.github/workflows/dependency-review.yml   ← blocks vulnerable deps in PRs
.github/dependabot.yml             ← weekly grouped dependency updates
```

Everything meaningful lives in `CalendarBuilder.tsx`. The parts worth knowing:

- `monthColumns` — seven buckets of **month indices**, keyed by the weekday each month starts on. Labels are looked up from `translations` only at render, so no logic depends on translated strings.
- `weekdayIndex = (col + row) % 7` — the entire weekday block is this one expression; row `r` is the week rotated left by `r`.
- `active = pinned ?? hovered` — one coordinate drives all three blocks' highlighting, which is why hovering a weekday also lights its months and dates. A pin beats a hover so touch selections survive stray pointer events.
- The date block renders an invisible mirror of the month grid as its top padding, so both blocks stay aligned at every breakpoint without hard-coded offsets.

---

## Known issues

Verified against a clean `npm ci`, with the app driven in a real browser.

### Resolved

**1. `npm run lint` crashed** on an ESLint/`typescript-eslint` version split. Fixed by regenerating the lockfile against ESLint 10 and `typescript-eslint` 8.69.

**2. `npm start` failed** — `server.js` imported an `express` that was in neither `dependencies` nor the lockfile. `server.js` and the `start` script are gone; `npm run preview` serves the production build at the real base path, which the Express root did not.

**3. No favicon, no link preview.** Resolved. `public/icon.svg` is the favicon; `apple-touch-icon.png` is the Home Screen icon (iOS will not take an SVG — the old SVG link meant Safari silently used a screenshot); `og.png` is a real 1200×630 preview. `og:image` needs an *absolute* URL, which `BASE_PATH` cannot supply, so CI passes `SITE_URL` from the same `configure-pages` step and `vite.config.ts` substitutes it into `index.html`.

**4. The date axis treated as month-specific.** Resolved, and the previous edition of this file understated it: the grid *does* mask. Once a month is selected, dates it does not have are struck through and disabled — verified in-browser as `[31]` for September, `[29, 30, 31]` for February 2026 and `[30, 31]` for February 2024. With no month selected the block correctly shows all of 1–31, because it is then month-agnostic by design. `isBeforeToday()` likewise takes a month and returns `false` rather than guessing when none is held.

**6. Nothing persisted or shareable.** Resolved. `?y=&lang=&m=&d=&w=` round-trips the whole view through `replaceState`, and a share button now exposes it.

**7. No print stylesheet.** Resolved — see the Prints row above.

**9. No tests.** Resolved: 44, over both the grid arithmetic and the perpetual layer, including the years 0–99 that the old `Date`-based version got wrong, exactness at year 123,456,789, and 400-year periodicity.

**10. No LICENSE.** Resolved — MIT.

**11. Installable, but not offline.** Resolved. Offline was never blocked by the app needing the network *after* load — it makes no requests at all once running — but by the browser having to fetch the app itself first, which nothing can skip without a service worker.

`sw.js` is generated at build time from the real bundle by a plugin in `vite.config.ts`, rather than by pulling in `vite-plugin-pwa` and Workbox to solve problems this app does not have: there is no API, no runtime data and no route it does not already ship, so the whole strategy is precache-on-install, serve-from-cache, drop-the-old-cache-on-activate. Navigations are answered from the one cached shell, which is what makes a shared `?y=&m=&d=` link open offline too.

The cache name is a hash of the **bytes actually served**, not of the file list. Hashing the list looked equivalent, because the JS and CSS filenames are content-addressed — but `index.html` and everything in `public/` keep stable names, so editing a meta tag or an icon produced an identical cache name and pinned returning visitors to the old copy permanently, since `activate` only drops caches whose name differs. The required entries install atomically, so a half-finished install cannot replace a working offline copy with an empty one. And only this app's own caches are dropped on activate: on a `<user>.github.io` origin, every other project that account publishes is a same-origin neighbour sharing one CacheStorage.

Verified by driving a real browser: 11 entries cached, then the network cut **and** the HTTP cache disabled, and a deep link still rendered the full grid.

### Open

**5. Accessibility: the last mile.** The 7×7 block is now a real `role="grid"` with `role="row"` wrappers (via `display: contents`, so the semantics cost no box), `aria-rowindex`/`aria-colindex`, and a roving tabindex so the whole block is one tab stop with arrow keys inside it. The heading remains an `aria-live` readout, so moving through cells announces the resolved date rather than a bare weekday.

What is still missing is **header association**: a screen reader is told the cell's coordinates but not that column 3 *is* December and row 4 *is* the 25th, because the month and date blocks are separate DOM subtrees and cannot be `headers`-associated without collapsing the three blocks back into one table — which is the layout this design deliberately moved away from. Those two blocks are therefore `role="group"`, not `role="grid"`: claiming grid semantics without implementing the keyboard pattern they oblige would be a worse lie than claiming none.

State is also still conveyed largely by colour.

**12. The week starts on Sunday, and that is hardcoded.** `0 = Sunday` runs through the seven rotations, the red Sunday column and the calendar-type vocabulary. Three of the four shipped languages sit in Monday-start or mixed-convention regions. This should become a setting before more of the type vocabulary hardens around it.

**13. Gregorian only.** The arithmetic is proleptic Gregorian and refuses below 1583. Julian dates, and therefore most historical ones, are out of scope for now — deliberately, since Julian doubles the type space to 28 and every UI decision above should settle first. Mixing the two silently is how date tools become untrustworthy.

---

## Deployment

The site is a static bundle published to GitHub Pages by
`.github/workflows/deploy.yml`, using GitHub's first-party Pages actions. It
runs two jobs.

**`build`** runs on pushes and pull requests alike: `npm ci`, then `npm run
lint`, then `npm run typecheck`, then `npm run build`, then uploads `dist/` as
a Pages artifact. Lint and typecheck run *before* the build, so a PR with a type
error fails in seconds rather than after a full bundle.

**`deploy`** runs only on `main`. Its one step is `actions/deploy-pages`, which
publishes the artifact through the `github-pages` environment over OIDC. There
is no `gh-pages` branch, no long-lived token, and no repository secret.

### Least privilege

The workflow's default grant is `permissions: {}` — empty. Each job opts into
exactly what it needs: `build` gets `contents: read` and `pages: read`;
`deploy` gets `pages: write` and `id-token: write`.

That split is the point. The workflow also triggers on `pull_request`, and PR
builds execute PR-controlled npm lifecycle scripts and build code. A single-job
version would hand publish-capable credentials to every PR build. An `if` on the
deploy *step* would not help either, because earlier steps in the same job would
still hold the token. Only `deploy` can publish, and nothing PR-controlled runs
there. Every checkout also uses `persist-credentials: false`, so no token is
left behind in `.git/config`.

### The base path

The site serves from `https://tanghoong.github.io/perpetual-calendars/`, so the
built asset URLs need that prefix or they 404. `vite.config.ts` reads it from
`BASE_PATH`, which CI supplies from `actions/configure-pages` — that action
resolves the repository's *actual* Pages base path, so a fork or a rename keeps
working with no code edit. The literal `/perpetual-calendars/` in
`vite.config.ts` is only the local fallback.

`npm run preview` honours the same base, so the local production check hits the
same URLs the deployed site does.

### One-time repository setup

These cannot be done from files. In the repository's web UI:

1. **Settings → Pages → Source → GitHub Actions.** Required. The workflow uses
   the Pages artifact API, which does nothing while the source is still set to
   "Deploy from a branch". If this repo was previously deploying from a
   `gh-pages` branch, this switch is the migration — after it, the old branch
   is dead weight and can be deleted.
2. **Settings → Code security → enable** Dependabot alerts, Dependabot security
   updates, secret scanning, and push protection.
3. **Settings → Code security → Private vulnerability reporting → enable**, so
   `SECURITY.md` has a working channel to point at.
4. **Settings → Rules → Rulesets** — protect `main`: require a pull request,
   and require the `Build`, `Analyze JavaScript/TypeScript`, and
   `Review dependency changes` checks to pass.

Step 1 is required for the site to deploy at all. Steps 2–4 are what make the
security workflows enforcing rather than advisory.

---

## Security

See [SECURITY.md](SECURITY.md) for the threat model, the reporting channel, and
the full control list. In short: CodeQL on every push and weekly, dependency
review blocking vulnerable packages in PRs, grouped Dependabot updates for both
npm and the workflow actions, and empty-by-default workflow permissions.

---

## Contributing

Issues and pull requests are welcome. [Known issues → Open](#open) is roughly in priority order, and [docs/DIRECTION.md](docs/DIRECTION.md) has the larger arc plus the decisions still to be made.

---

## License

MIT. See [LICENSE](LICENSE).
