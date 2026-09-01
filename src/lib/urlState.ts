import { isLanguage, type Language } from './i18n';

/**
 * The whole view, encoded in the query string.
 *
 * A tool distributed by shared link should be able to share a *view*, not just
 * itself: `?y=2027&m=8&d=2` opens on that exact lookup. It also means a reload
 * does not throw away what the reader was looking at.
 */
export interface ViewState {
  year: number;
  language: Language;
  /** Selected month index 0..11, or null. */
  month: number | null;
  /** Selected day-of-month 1..31, or null. */
  date: number | null;
  /** Selected weekday 0..6 (0 = Sunday), or null. */
  weekday: number | null;
}

const intOrNull = (raw: string | null, min: number, max: number): number | null => {
  if (raw === null || raw.trim() === '') return null;
  const n = Number(raw);
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
};

/**
 * Reads the view from the URL, falling back to a remembered language and then
 * to the defaults. Every field is validated — a hand-edited or truncated link
 * should degrade to a sane view, never to a broken one.
 */
export const readViewState = (
  search: string,
  currentYear: number,
  yearBounds: { min: number; max: number },
): ViewState => {
  const params = new URLSearchParams(search);
  const year = intOrNull(params.get('y'), yearBounds.min, yearBounds.max) ?? currentYear;

  // English is the default. The switcher is gone from the UI, but ?lang= still
  // works, so a Chinese/Malay/Vietnamese link keeps rendering in that language.
  const fromUrl = params.get('lang');
  const language: Language = isLanguage(fromUrl) ? fromUrl : 'en';

  const month = intOrNull(params.get('m'), 0, 11);
  let date = intOrNull(params.get('d'), 1, 31);
  // A link naming 31 February is not a view worth restoring; drop the date and
  // keep the month rather than rendering an impossible selection.
  if (month !== null && date !== null && date > new Date(year, month + 1, 0).getDate()) {
    date = null;
  }

  // Any two axes fix the third, so a link carrying all three is over-specified
  // — probably hand-edited. Month and date are the ones that name a single real
  // date, so they win and the weekday is dropped rather than contradicting them.
  const weekday = month !== null && date !== null ? null : intOrNull(params.get('w'), 0, 6);

  return { year, language, month, date, weekday };
};

/** Serialises the view, omitting anything at its default so a plain visit
    keeps a clean URL. */
export const toSearchParams = (state: ViewState, currentYear: number): string => {
  const params = new URLSearchParams();
  if (state.year !== currentYear) params.set('y', String(state.year));
  if (state.language !== 'en') params.set('lang', state.language);
  if (state.month !== null) params.set('m', String(state.month));
  if (state.date !== null) params.set('d', String(state.date));
  if (state.weekday !== null) params.set('w', String(state.weekday));
  const query = params.toString();
  return query ? `?${query}` : '';
};

/**
 * Mirrors the view into the address bar without touching history.
 *
 * replaceState, not pushState: every hover-free click would otherwise become a
 * back-button stop, and forty taps through the year stepper would bury the page
 * the reader arrived from.
 */
export const syncUrl = (state: ViewState, currentYear: number): void => {
  const query = toSearchParams(state, currentYear);
  const next = `${window.location.pathname}${query}${window.location.hash}`;
  if (next !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
    window.history.replaceState(null, '', next);
  }
};
