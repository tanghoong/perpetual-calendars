import { describe, expect, it } from 'vitest';
import {
  CALENDAR_TYPE_COUNT,
  calendarTypeOf,
  columnForMonth,
  columnForWeekdayInRow,
  dateAt,
  datesInRow,
  daysInMonth,
  dominicalLetterOf,
  FIRST_GREGORIAN_YEAR,
  firstWeekdayOf,
  isBeforeToday,
  isLeapType,
  isLeapYear,
  jan1Weekday,
  LAST_SUPPORTED_YEAR,
  MONTHS_WITH_31_DAYS,
  monthColumnsFor,
  rowForDate,
  resolveCrosshair,
  rowForWeekdayInColumn,
  sameGridYears,
  startWeekdayOfType,
  weekdayAt,
  weekdayOf,
  yearsWhere,
} from './calendar';

// A wide sweep rather than a handful of hand-picked years: the whole point of
// this module is that it is right for every year, and the arithmetic is cheap.
const YEARS = Array.from({ length: 60 }, (_, i) => 1995 + i);

describe('firstWeekdayOf', () => {
  it('agrees with Date for every month of every sampled year', () => {
    for (const y of YEARS) {
      for (let m = 0; m < 12; m++) {
        expect(firstWeekdayOf(y, m)).toBe(new Date(y, m, 1).getDay());
      }
    }
  });
});

describe('daysInMonth', () => {
  it('matches the known month lengths', () => {
    // 2023 is a common year, 2024 a leap year.
    expect([...Array(12).keys()].map(m => daysInMonth(2023, m))).toEqual([
      31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31,
    ]);
    expect(daysInMonth(2024, 1)).toBe(29);
  });

  it('is consistent with MONTHS_WITH_31_DAYS', () => {
    for (const y of YEARS) {
      for (let m = 0; m < 12; m++) {
        expect(daysInMonth(y, m) === 31).toBe(MONTHS_WITH_31_DAYS.has(m));
      }
    }
  });
});

describe('isLeapYear', () => {
  it('applies the full Gregorian rule, including the century exceptions', () => {
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(2023)).toBe(false);
    expect(isLeapYear(2000)).toBe(true); // divisible by 400
    expect(isLeapYear(1900)).toBe(false); // divisible by 100, not 400
    expect(isLeapYear(2100)).toBe(false);
  });
});

describe('monthColumnsFor', () => {
  it('places all twelve months exactly once', () => {
    for (const y of YEARS) {
      const flat = monthColumnsFor(y).flat().sort((a, b) => a - b);
      expect(flat).toEqual([...Array(12).keys()]);
    }
  });

  it('files each month under the weekday it actually starts on', () => {
    for (const y of YEARS) {
      monthColumnsFor(y).forEach((months, weekday) => {
        for (const m of months) expect(new Date(y, m, 1).getDay()).toBe(weekday);
      });
    }
  });

  it('never leaves a column empty, so callers can index [0] safely', () => {
    // Relied on by the readout, which takes columnMonths[0]. Holds because the
    // twelve cumulative month-length offsets cover all seven residues mod 7.
    for (const y of YEARS) {
      for (const column of monthColumnsFor(y)) expect(column.length).toBeGreaterThan(0);
    }
  });
});

describe('weekdayAt', () => {
  it('is the grid invariant: the cell names the real weekday', () => {
    // For every year, month and date, the cell at (row of date, column of
    // month) must name that date's actual weekday. This is the single claim
    // the entire UI rests on.
    for (const y of YEARS) {
      for (let m = 0; m < 12; m++) {
        for (let d = 1; d <= daysInMonth(y, m); d++) {
          const cell = weekdayAt(rowForDate(d), columnForMonth(y, m));
          expect(cell).toBe(new Date(y, m, d).getDay());
        }
      }
    }
  });

  it('stays within 0..6', () => {
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 7; col++) {
        expect(weekdayAt(row, col)).toBeGreaterThanOrEqual(0);
        expect(weekdayAt(row, col)).toBeLessThan(7);
      }
    }
  });
});

describe('rowForDate / dateAt', () => {
  it('round-trips every date 1..31', () => {
    for (let d = 1; d <= 31; d++) {
      const row = rowForDate(d);
      expect(datesInRow(row)).toContain(d);
    }
  });

  it('lays out 1..31 across the block with no gaps or repeats', () => {
    const seen: number[] = [];
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 5; col++) {
        const d = dateAt(row, col);
        if (d !== null) seen.push(d);
      }
    }
    expect(seen.sort((a, b) => a - b)).toEqual(Array.from({ length: 31 }, (_, i) => i + 1));
  });

  it('returns null past 31', () => {
    expect(dateAt(6, 4)).toBeNull(); // 7 + 28 = 35
    expect(dateAt(3, 4)).toBeNull(); // 4 + 28 = 32
    expect(dateAt(2, 4)).toBe(31);
  });
});

describe('datesInRow', () => {
  it('clips to the month length', () => {
    // Row 2 is 3, 10, 17, 24, 31 — the row that exposes short months.
    expect(datesInRow(2)).toEqual([3, 10, 17, 24, 31]);
    expect(datesInRow(2, 30)).toEqual([3, 10, 17, 24]);
    expect(datesInRow(2, 28)).toEqual([3, 10, 17, 24]);
  });

  it('never claims a date the month does not have', () => {
    for (const y of YEARS) {
      for (let m = 0; m < 12; m++) {
        const limit = daysInMonth(y, m);
        for (let row = 0; row < 7; row++) {
          for (const d of datesInRow(row, limit)) {
            expect(d).toBeLessThanOrEqual(limit);
            // And the date really does fall on the weekday the cell claims.
            expect(new Date(y, m, d).getDay()).toBe(weekdayAt(row, columnForMonth(y, m)));
          }
        }
      }
    }
  });

  it('always yields at least one date, since row+1 is at most 7', () => {
    for (let row = 0; row < 7; row++) expect(datesInRow(row, 28).length).toBeGreaterThan(0);
  });
});

describe('isBeforeToday', () => {
  const today = new Date(2026, 8, 2); // 2 September 2026

  it('is false without a month, because the date axis is month-agnostic', () => {
    // The old bug: a bare day-of-month comparison dimmed the 3rd of December
    // as readily as the 3rd of January. With no month selected there is no
    // answer, and false is the honest one.
    expect(isBeforeToday(2026, null, 1, today)).toBe(false);
    expect(isBeforeToday(2026, null, 31, today)).toBe(false);
  });

  it('compares within the current month', () => {
    expect(isBeforeToday(2026, 8, 1, today)).toBe(true);
    expect(isBeforeToday(2026, 8, 2, today)).toBe(false); // today itself
    expect(isBeforeToday(2026, 8, 3, today)).toBe(false);
  });

  it('treats earlier and later months wholesale', () => {
    expect(isBeforeToday(2026, 7, 31, today)).toBe(true); // all of August
    expect(isBeforeToday(2026, 9, 1, today)).toBe(false); // none of October
  });

  it('compares years first', () => {
    expect(isBeforeToday(2025, 11, 31, today)).toBe(true);
    expect(isBeforeToday(2027, 0, 1, today)).toBe(false);
  });
});

describe('inverse lookups', () => {
  it('columnForWeekdayInRow inverts weekdayAt', () => {
    for (let weekday = 0; weekday < 7; weekday++) {
      for (let row = 0; row < 7; row++) {
        expect(weekdayAt(row, columnForWeekdayInRow(weekday, row))).toBe(weekday);
      }
    }
  });

  it('rowForWeekdayInColumn inverts weekdayAt', () => {
    for (let weekday = 0; weekday < 7; weekday++) {
      for (let col = 0; col < 7; col++) {
        expect(weekdayAt(rowForWeekdayInColumn(weekday, col), col)).toBe(weekday);
      }
    }
  });

  it('answers "which months is date D on weekday W" correctly', () => {
    // The headline claim of the reverse lookup, checked against Date for every
    // year, date and weekday: the months standing in the resolved column are
    // exactly the months where that date falls on that weekday.
    for (const y of YEARS) {
      const columns = monthColumnsFor(y);
      for (let date = 1; date <= 31; date++) {
        for (let weekday = 0; weekday < 7; weekday++) {
          const predicted = columns[columnForWeekdayInRow(weekday, rowForDate(date))]
            .filter(m => daysInMonth(y, m) >= date)
            .sort((a, b) => a - b);
          const actual = [...Array(12).keys()].filter(
            m => daysInMonth(y, m) >= date && new Date(y, m, date).getDay() === weekday,
          );
          expect(predicted).toEqual(actual);
        }
      }
    }
  });

  it('answers "which dates in month M are weekday W" correctly', () => {
    for (const y of YEARS) {
      for (let m = 0; m < 12; m++) {
        for (let weekday = 0; weekday < 7; weekday++) {
          const row = rowForWeekdayInColumn(weekday, columnForMonth(y, m));
          const predicted = datesInRow(row, daysInMonth(y, m));
          const actual: number[] = [];
          for (let d = 1; d <= daysInMonth(y, m); d++) {
            if (new Date(y, m, d).getDay() === weekday) actual.push(d);
          }
          expect(predicted).toEqual(actual);
        }
      }
    }
  });
});

describe('resolveCrosshair', () => {
  it('resolves the forward lookup from month and date', () => {
    for (const y of YEARS) {
      for (let m = 0; m < 12; m++) {
        for (let d = 1; d <= daysInMonth(y, m); d++) {
          const { col, row } = resolveCrosshair(y, { month: m, date: d, weekday: null });
          expect(col).not.toBeNull();
          expect(row).not.toBeNull();
          // The cell it lands on names the real weekday.
          expect(weekdayAt(row!, col!)).toBe(new Date(y, m, d).getDay());
        }
      }
    }
  });

  it('resolves the column from date + weekday', () => {
    for (const y of YEARS) {
      for (let m = 0; m < 12; m++) {
        for (let d = 1; d <= daysInMonth(y, m); d++) {
          const weekday = new Date(y, m, d).getDay();
          const { col } = resolveCrosshair(y, { month: null, date: d, weekday });
          // The month really does stand in the resolved column.
          expect(monthColumnsFor(y)[col!]).toContain(m);
        }
      }
    }
  });

  it('resolves the row from month + weekday', () => {
    for (const y of YEARS) {
      for (let m = 0; m < 12; m++) {
        for (let weekday = 0; weekday < 7; weekday++) {
          const { row } = resolveCrosshair(y, { month: m, date: null, weekday });
          // Every date in the resolved row falls on that weekday.
          for (const d of datesInRow(row!, daysInMonth(y, m))) {
            expect(new Date(y, m, d).getDay()).toBe(weekday);
          }
        }
      }
    }
  });

  it('leaves an axis null when it cannot be determined', () => {
    expect(resolveCrosshair(2026, { month: null, date: null, weekday: null })).toEqual({ col: null, row: null });
    // A lone date fixes the row but not the column.
    expect(resolveCrosshair(2026, { month: null, date: 15, weekday: null })).toEqual({ col: null, row: 0 });
    // A lone weekday fixes neither.
    expect(resolveCrosshair(2026, { month: null, date: null, weekday: 3 })).toEqual({ col: null, row: null });
  });
});

/* ------------------------------------------------------------------ *
 * The perpetual layer
 * ------------------------------------------------------------------ */

/**
 * A proleptic-Gregorian oracle that survives years 0..99.
 *
 * `new Date(26, 0, 1)` is 1926 — the two-digit-year legacy of the constructor —
 * which is exactly the bug this module was rewritten to escape, so the tests
 * below cannot use it as their reference. `setUTCFullYear` is not affected.
 */
const weekdayViaUTC = (year: number, monthIndex: number, date: number): number => {
  const d = new Date(Date.UTC(2000, monthIndex, date));
  d.setUTCFullYear(year);
  return d.getUTCDay();
};

describe('perpetual arithmetic', () => {
  it('agrees with Date across the whole Gregorian era, not just nearby years', () => {
    for (let y = FIRST_GREGORIAN_YEAR; y <= 2400; y += 7) {
      for (let m = 0; m < 12; m++) {
        expect(firstWeekdayOf(y, m)).toBe(new Date(y, m, 1).getDay());
      }
    }
  });

  it('is right for years 0..99, where the old Date-based version was not', () => {
    for (let y = 0; y < 100; y++) {
      expect(jan1Weekday(y)).toBe(weekdayViaUTC(y, 0, 1));
    }
    // The specific trap: Date maps year 26 to 1926, which starts on a Friday.
    expect(new Date(26, 0, 1).getFullYear()).toBe(1926);
    expect(jan1Weekday(26)).toBe(weekdayViaUTC(26, 0, 1));
  });

  it('stays exact at year magnitudes that would overflow a day count', () => {
    // Folding into 1..400 is what keeps this in the safe-integer range.
    for (const y of [100000, 1000000, 123456789]) {
      expect(jan1Weekday(y)).toBe(jan1Weekday(y % 400 === 0 ? 400 : y % 400));
      expect(Number.isInteger(jan1Weekday(y))).toBe(true);
    }
  });

  it('repeats exactly every 400 years', () => {
    for (let y = FIRST_GREGORIAN_YEAR; y < FIRST_GREGORIAN_YEAR + 400; y++) {
      expect(calendarTypeOf(y + 400)).toBe(calendarTypeOf(y));
      expect(monthColumnsFor(y + 400)).toEqual(monthColumnsFor(y));
    }
  });
});

describe('calendarTypeOf', () => {
  it('produces exactly fourteen types, and every one of them occurs', () => {
    const seen = new Set<number>();
    for (let y = 2000; y < 2400; y++) seen.add(calendarTypeOf(y));
    expect(seen.size).toBe(CALENDAR_TYPE_COUNT);
    expect([...seen].sort((a, b) => a - b)).toEqual([...Array(CALENDAR_TYPE_COUNT).keys()]);
  });

  it('gives identical grids to same-type years and different grids otherwise', () => {
    const byType = new Map<number, number[][]>();
    for (let y = 1800; y < 2200; y++) {
      const type = calendarTypeOf(y);
      const grid = monthColumnsFor(y);
      const known = byType.get(type);
      if (known === undefined) byType.set(type, grid);
      else expect(grid).toEqual(known);
    }
    // Distinct types must not collide, or "same grid" would be a weaker claim
    // than the UI makes.
    const serialised = [...byType.values()].map(g => JSON.stringify(g));
    expect(new Set(serialised).size).toBe(CALENDAR_TYPE_COUNT);
  });

  it('separates leap years from common years', () => {
    for (let y = 1900; y < 2100; y++) {
      expect(isLeapType(calendarTypeOf(y))).toBe(isLeapYear(y));
      expect(startWeekdayOfType(calendarTypeOf(y))).toBe(jan1Weekday(y));
    }
  });
});

describe('dominicalLetterOf', () => {
  it('matches the published letters', () => {
    expect(dominicalLetterOf(calendarTypeOf(2023))).toBe('A');
    expect(dominicalLetterOf(calendarTypeOf(2026))).toBe('D');
    expect(dominicalLetterOf(calendarTypeOf(2024))).toBe('GF');
    expect(dominicalLetterOf(calendarTypeOf(2020))).toBe('ED');
  });

  it('gives one letter to common years and two to leap years', () => {
    for (let type = 0; type < CALENDAR_TYPE_COUNT; type++) {
      expect(dominicalLetterOf(type)).toHaveLength(isLeapType(type) ? 2 : 1);
    }
  });

  it('puts the letter on the year\'s first Sunday', () => {
    for (let y = 1990; y < 2060; y++) {
      const letter = dominicalLetterOf(calendarTypeOf(y))[0];
      const firstSunday = 1 + ((7 - jan1Weekday(y)) % 7);
      expect(weekdayOf(y, 0, firstSunday)).toBe(0);
      expect('ABCDEFG'[firstSunday - 1]).toBe(letter);
    }
  });
});

describe('sameGridYears', () => {
  const BOUNDS = { min: FIRST_GREGORIAN_YEAR, max: LAST_SUPPORTED_YEAR };

  it('includes the year itself, in order', () => {
    const years = sameGridYears(2026, { before: 5, after: 5, ...BOUNDS });
    expect(years).toContain(2026);
    expect([...years].sort((a, b) => a - b)).toEqual(years);
    expect(years).toEqual([
      1981, 1987, 1998, 2009, 2015, 2026, 2037, 2043, 2054, 2065, 2071,
    ]);
  });

  it('returns only years whose grid is byte-identical', () => {
    for (const anchor of [1999, 2024, 2026, 2100, 2400]) {
      const grid = monthColumnsFor(anchor);
      for (const y of sameGridYears(anchor, { before: 4, after: 4, ...BOUNDS })) {
        expect(monthColumnsFor(y)).toEqual(grid);
      }
    }
  });

  it('finds leap-year partners too, which recur far more rarely', () => {
    // A common-year type returns about every 6 or 11 years; a leap-year type
    // only every 28, and further across a century boundary. A fixed-width
    // window would have found plenty of one and almost none of the other.
    const leap = sameGridYears(2024, { before: 3, after: 3, ...BOUNDS });
    expect(leap).toHaveLength(7);
    for (const y of leap) expect(isLeapYear(y)).toBe(true);
    expect(leap).toContain(1996);
    expect(leap).toContain(2052);
  });

  it('clamps at the bounds instead of inventing years', () => {
    const atStart = sameGridYears(FIRST_GREGORIAN_YEAR, {
      before: 5,
      after: 2,
      ...BOUNDS,
    });
    expect(atStart[0]).toBe(FIRST_GREGORIAN_YEAR);
    expect(atStart.every(y => y >= FIRST_GREGORIAN_YEAR && y <= LAST_SUPPORTED_YEAR)).toBe(true);
  });

  it('answers "which years is this date this weekday?" — the fourth lookup', () => {
    // The UI leans on this: every year sharing a grid puts every date on the
    // same weekday, so the strip of same-grid years *is* the answer.
    for (const [m, d] of [[0, 1], [8, 2], [11, 25], [1, 28]] as const) {
      const weekday = weekdayOf(2026, m, d);
      const viaGrid = sameGridYears(2026, { before: 6, after: 6, ...BOUNDS });
      for (const y of viaGrid) expect(weekdayOf(y, m, d)).toBe(weekday);
      // And the direct search agrees, over the span the strip covers.
      const span = yearsWhere(m, d, weekday, viaGrid[0], viaGrid[viaGrid.length - 1]);
      expect(span).toEqual(expect.arrayContaining(viaGrid));
    }
  });
});

describe('yearsWhere', () => {
  it('agrees with a Date sweep', () => {
    const found = yearsWhere(11, 25, 5, 1990, 2060);
    const expected: number[] = [];
    for (let y = 1990; y <= 2060; y++) {
      if (new Date(y, 11, 25).getDay() === 5) expected.push(y);
    }
    expect(found).toEqual(expected);
  });

  it('skips years where the date does not exist', () => {
    const found = yearsWhere(1, 29, 4, 1990, 2060);
    for (const y of found) {
      expect(isLeapYear(y)).toBe(true);
      expect(weekdayOf(y, 1, 29)).toBe(4);
    }
    // 29 February is the one case where the answer is a strict subset of a
    // single calendar type rather than the whole of it.
    expect(found.every(y => daysInMonth(y, 1) === 29)).toBe(true);
  });
});
