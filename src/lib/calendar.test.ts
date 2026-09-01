import { describe, expect, it } from 'vitest';
import {
  columnForMonth,
  columnForWeekdayInRow,
  dateAt,
  datesInRow,
  daysInMonth,
  firstWeekdayOf,
  isBeforeToday,
  isLeapYear,
  MONTHS_WITH_31_DAYS,
  monthColumnsFor,
  rowForDate,
  resolveCrosshair,
  rowForWeekdayInColumn,
  weekdayAt,
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
