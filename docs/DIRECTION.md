# Direction: from a one-page year to a perpetual calendar

## Where we actually are

The repo is called **perpetual-calendars**. What is built is the **One Page Calendar**: a
7-column × 12-month lookup grid that answers *month × date → weekday* (and both reverses)
in one intersection, for **one year at a time**.

That is a one-page *annual* calendar with a year stepper. It is not yet perpetual in the
sense [Wikipedia](https://en.wikipedia.org/wiki/Perpetual_calendar) means: a calendar valid
across many years, where the year is resolved *by the instrument* rather than supplied to it.

Three things say so:

1. **The year is an input, bounded arbitrarily.** `MIN_YEAR = THIS_YEAR - 60`,
   `MAX_YEAR = THIS_YEAR + 60` in `CalendarBuilder.tsx`. A perpetual calendar has no such
   window. 121 years is a *long* calendar, not a perpetual one.
2. **The year to layout mapping is computed and thrown away.** `monthColumnsFor(year)` asks
   `new Date` where each month starts, buckets the answer, and discards the structure. The
   reader never learns *why* the months landed where they did, or that the arrangement
   repeats.
3. **The layout is already perpetual and never says so.** The date block and the weekday
   block are year-invariant — the README says this outright. Only the twelve month chips
   move. That is the whole perpetual-calendar insight, sitting one step from being shown.

The gap is not architectural. It is one fact away.

## The fact to build on

There are exactly **fourteen** distinct arrangements of the twelve month chips. Ever.

```
distinct 12-month signatures over 1900-2299 : 14
distinct (Jan-1 weekday, leap?) pairs       : 14
```

Seven common years (starting Sun through Sat) and seven leap years — the classic *fourteen
one-year calendars* of the perpetual-calendar literature, and the same thing the
**dominical letter** names (A-G, and AG-BA for leap years).

This matters more in this layout than anywhere else, because here **the arrangement is the
picture**. Two years of the same type render a byte-identical grid. On a conventional
twelve-block calendar two years of the same type also produce identical pages, but you
would have to overlay twelve grids to notice. Here it is one glance.

Concretely, for 2026 (a common year starting Thursday):

```
same grid as 2026 : 1970 1981 1987 1998 2009 2015 [2026] 2037 2043 2054 2065 2071 2082 2093 2099
gaps              :   11    6   11   11    6   11    11    6    11   11    6   11   11    6
```

Fifteen years in a 130-year span share this exact page. That is the perpetual claim, and it
is currently invisible.

Two more facts that belong on the page rather than in a footnote:

- The Gregorian calendar repeats **every 400 years, exactly**: 146,097 days = 20,871 weeks,
  no remainder. The pattern above is not approximate, it is periodic.
- The fourteen types are **not equally common**. Per 400 years the common-year types run
  43, 43, 43, 43, 43, 44, 44 and the leap-year types run 13, 13, 13, 14, 14, 15, 15. Some
  pages are rarer than others — a good thing for a printable artifact to know about itself.

## The goal

> **Make the year a fourth axis of the same lookup, reduced to its calendar type, so the
> instrument is valid for every year rather than for a sliding 121-year window.**

The app already models month, date and weekday as three co-equal axes where *any two fix
the third* (`resolveCrosshair`, `AxisSelection`). Year-type is a fourth axis of the same
shape, not a bolt-on:

| held | answer | status |
|---|---|---|
| month + date | the weekday | works |
| date + weekday | the months | works |
| month + weekday | the dates | works |
| **year** | **its type, and every other year sharing it** | missing |
| **type + month + date** | **the weekday, for ~15 years at once** | missing |
| **month + date + weekday** | **which years** — "when is my birthday a Saturday?" | missing |

The last row is the one no conventional calendar can answer at all, and it falls out of the
existing architecture almost for free.

## Phases

### Phase 1 — Make the arithmetic perpetual (`src/lib/calendar.ts`)

The math layer is already pure, documented and tested. It just still delegates to `Date`.

- **Replace `new Date(year, m, 1).getDay()` with modular arithmetic** over the proleptic
  Gregorian calendar. This is not purism: `new Date(26, 0, 1)` returns **1926**, so
  `firstWeekdayOf` is silently wrong for years 0-99. That bug is latent only because
  `MIN_YEAR` keeps us away from it. Lifting the bound without fixing this ships a wrong
  calendar.
- **Add `calendarTypeOf(year) -> 0..13`** plus its dominical letter, and make
  `monthColumnsFor` a function of the *type*, with the year-taking version a thin wrapper.
  This single change turns the codebase perpetual; everything below consumes it.
- **Add the inverse, `yearsOfType(type, range)`** — the "same grid as" list.
- **Add `yearsWhere(month, date, weekday, range)`** — the fourth reverse lookup.
- Extend `calendar.test.ts`. The existing suite checks the grid against `Date` across 60
  years; keep that as the oracle where `Date` is trustworthy, and add algebraic tests
  (400-year periodicity, the 14 types exhaustively, the type counts) where it is not.

**Done when:** every function in `calendar.ts` accepts a year of any magnitude, and the
suite proves it against both `Date` and the cycle algebra.

### Phase 2 — Surface the fourth axis (`CalendarBuilder.tsx`)

- **A type badge beside the year**: `2026 · Type F · common year starting Thursday`.
  Clicking it selects the *type*, not the year.
- **A "same grid as" strip** — the year list above, as chips. This is the highest-value
  single addition in the plan: it is the proof, the shareable fact, and the reason to print
  the page.
- **Year stepping by type.** The chevrons currently step ±1 year. Add a jump to the previous
  and next year of the *same* type. Crossing 11 years and landing on an identical grid is
  the demonstration.
- **Lift `MIN_YEAR`/`MAX_YEAR`.** Keep the `<select>` wheel for nearby years (it is a good
  interaction) but let a typed year go anywhere Phase 1 supports.
- **Extend `?y=` with `?t=`** in `urlState.ts` so a *type* is linkable, not just a year.
  Same validation discipline as the existing params.

**Done when:** a reader can land on the page, see that their year is one of fourteen, and
see the other fourteen-odd years the same page serves.

### Phase 3 — Close the date-axis gap (README known issue #4)

The date block shows an unmasked 1-31 for every month. For an annual calendar that is a
rough edge. For a *perpetual* calendar it is the wrong thing to be vague about — month
length and leap years are exactly what a perpetual-calendar mechanism exists to track (it
is the defining complication in the watch sense of the term).

The headline already does this arithmetic correctly (`datesInRow(row, dateLimit)`, and
`isBeforeToday` takes a month rather than guessing). Push it into the grid: mask 29/30/31
against the resolved month, and render 29 February as type-dependent rather than flatly
present. This also finally makes the dimming honest.

### Phase 4 — Earn the plural

Only now does *perpetual-calendar**s*** mean something. One arithmetic core, several
instruments, sharing state through the same URL:

1. **The 14-type index** — a year-to-type table, the classic tabular perpetual calendar.
   Small, printable, and it is Phase 1 rendered directly.
2. **A volvelle / wheel** — the mechanical form (Plana's rotating drum, slide charts).
   Draggable SVG, no new math at all, and it is the form most people picture when they hear
   "perpetual calendar".
3. **A Doomsday-rule trainer** — the mental method, as practice. Turns the site from a
   lookup into a way to stop needing one.

Recommend 1, then 2, and treat 3 as optional. Deliberately *not* in scope yet:
Julian-Gregorian conversion and pre-1582 dates. It is the natural historical extension, but
it doubles the type space (28 Julian types) and every UI decision above should settle first.

### Phase 5 — Make the page a page

A calendar whose entire premise is *fits on one page* still has no `@media print`
(known issue #7) and no raster `og:image` (#3). With the "same grid as" strip in place,
printing acquires a real purpose: the sheet is valid for fifteen years, and it says so.

## Decisions needed before Phase 1

1. **Scope of "perpetual".** Gregorian-only (proleptic, any year), or Julian too?
   *Recommend:* Gregorian proleptic now, Julian as an explicit later mode. Mixing them
   silently is how date tools become untrustworthy.
2. **One app or several pages?** *Recommend:* one app, one `calendar.ts`, an instrument
   switcher. The plural is about instruments over shared math, not separate sites.
3. **Week start.** `0 = Sunday` is baked in, Sunday is red, and the weekday block's seven
   rotations assume it. Three of the four shipped languages sit in Monday-start or
   mixed-convention regions. *Recommend:* make week start a setting in Phase 2, before the
   type vocabulary hardens around Sunday.
4. **Naming.** Does "One Page Calendar" stay the product name with "perpetual calendar" as
   the category, or does the flagship take the repo's name? The README answers this by
   silence today.

## What not to do

- No date library. The pure-arithmetic core is the repo's best asset; a dependency would
  hide exactly the structure this direction exists to expose.
- No backend, no storage. The URL is already the state and should stay that way.
- No twelve-month-grid view. That is the thing this replaces.
