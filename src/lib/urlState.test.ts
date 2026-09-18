import { describe, expect, it } from 'vitest';
import { readViewState, toSearchParams, type ViewState } from './urlState';

const BOUNDS = { min: 1583, max: 9999 };
const read = (search: string, currentYear = 2026) =>
  readViewState(search, currentYear, BOUNDS);

const view = (over: Partial<ViewState> = {}): ViewState => ({
  year: 2026,
  language: 'en',
  month: null,
  date: null,
  weekday: null,
  ...over,
});

describe('toSearchParams', () => {
  it('keeps a bare visit clean', () => {
    expect(toSearchParams(view(), 2026)).toBe('');
  });

  it('always names the year once something is selected', () => {
    // The reason this matters: "current year" is resolved from the *reader's*
    // clock. A link shared in December that omitted the year would answer about
    // the following year when opened in January, and every weekday in it would
    // be wrong. Tidiness is only worth it for a link that selects nothing.
    expect(toSearchParams(view({ month: 11, date: 25 }), 2026)).toContain('y=2026');
    expect(toSearchParams(view({ month: 11 }), 2026)).toContain('y=2026');
    expect(toSearchParams(view({ date: 13, weekday: 5 }), 2026)).toContain('y=2026');
  });

  it('still names a year that is not the current one', () => {
    expect(toSearchParams(view({ year: 2043 }), 2026)).toContain('y=2043');
  });

  it('omits a language at its default and carries any other', () => {
    expect(toSearchParams(view(), 2026)).not.toContain('lang');
    expect(toSearchParams(view({ language: 'zh' }), 2026)).toContain('lang=zh');
  });
});

describe('round-tripping', () => {
  it('survives a reader whose clock has rolled into the next year', () => {
    // The bug this closes, end to end: serialise in 2026, read back as if it is
    // now 2027, and the view must be unchanged.
    const shared = view({ month: 11, date: 25 });
    const restored = read(toSearchParams(shared, 2026), 2027);
    expect(restored.year).toBe(2026);
    expect(restored.month).toBe(11);
    expect(restored.date).toBe(25);
  });

  it('restores every selectable combination unchanged', () => {
    const cases: ViewState[] = [
      view({ month: 0, date: 1 }),
      view({ year: 2043, month: 8, date: 2, language: 'vi' }),
      view({ date: 13, weekday: 5 }),
      view({ month: 5, weekday: 3, language: 'ms' }),
      view({ year: 1583 }),
      view({ year: 9999, month: 11, date: 31 }),
    ];
    for (const state of cases) {
      expect(read(toSearchParams(state, 2026), 2026)).toEqual(state);
    }
  });
});

describe('readViewState', () => {
  it('falls back to the reader\'s year when none is given', () => {
    expect(read('').year).toBe(2026);
    expect(read('', 2031).year).toBe(2031);
  });

  it('rejects a year outside the calendar\'s range', () => {
    expect(read('?y=1582').year).toBe(2026);
    expect(read('?y=10000').year).toBe(2026);
    expect(read('?y=notayear').year).toBe(2026);
  });

  it('drops a date the named month cannot hold', () => {
    // 31 February is not a view worth restoring; the month is kept and the
    // impossible date dropped, rather than rendering a contradiction.
    expect(read('?m=1&d=31')).toMatchObject({ month: 1, date: null });
    expect(read('?y=2025&m=1&d=29')).toMatchObject({ month: 1, date: null });
    // ...but a real 29 February survives.
    expect(read('?y=2024&m=1&d=29')).toMatchObject({ month: 1, date: 29 });
  });

  it('drops an over-specified weekday, because month and date already fix it', () => {
    expect(read('?m=11&d=25&w=3').weekday).toBeNull();
    // With only one of the two, the weekday is the other half of the lookup.
    expect(read('?d=13&w=5')).toMatchObject({ date: 13, weekday: 5 });
    expect(read('?m=8&w=5')).toMatchObject({ month: 8, weekday: 5 });
  });

  it('ignores junk rather than breaking', () => {
    expect(read('?m=99&d=0&w=9&lang=klingon')).toEqual(view({ month: null, date: null }));
  });
});
