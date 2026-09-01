/**
 * Cached Intl formatters.
 *
 * `new Intl.DateTimeFormat(...)` is not cheap — it resolves and loads locale
 * data — and the naive version built one per call. Rendering the month block
 * alone constructed twelve of them for the twelve accessible names, on every
 * render, which meant twelve more on every hover. Keyed by locale and kind, so
 * the whole app holds at most a handful.
 */

const OPTIONS = {
  /** "Wednesday, 2 September 2026" — field order per locale. */
  fullDate: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
  /** "September 2026" */
  monthYear: { month: 'long', year: 'numeric' },
  /** "Wednesday" */
  weekday: { weekday: 'long' },
  /** "15 July" — no year, because the companion line shares the heading's. */
  dayMonth: { day: 'numeric', month: 'long' },
} as const satisfies Record<string, Intl.DateTimeFormatOptions>;

export type FormatKind = keyof typeof OPTIONS;

const cache = new Map<string, Intl.DateTimeFormat>();

export const formatDate = (locale: string, kind: FormatKind, date: Date): string => {
  const key = `${locale}:${kind}`;
  let formatter = cache.get(key);
  if (formatter === undefined) {
    formatter = new Intl.DateTimeFormat(locale, OPTIONS[kind]);
    cache.set(key, formatter);
  }
  return formatter.format(date);
};

/**
 * Joins a list the way the locale does — "March, July and November" in English,
 * with the right connector and spacing elsewhere. Falls back to a comma join
 * where ListFormat is unavailable.
 */
export const formatList = (locale: string, items: string[]): string => {
  try {
    return new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' }).format(items);
  } catch {
    return items.join(', ');
  }
};
