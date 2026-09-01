/**
 * The whole calendar, as pure functions over indices.
 *
 * Nothing here touches React, the DOM, or a translated string — a month is an
 * index 0..11 and a weekday is an index 0..6, which is what lets a new language
 * be one table entry rather than a second copy of this logic. It is also what
 * makes the arithmetic testable, and this is the part that must never be wrong:
 * a calendar that is off by one is worse than no calendar.
 */

/** Months with 31 days, by index. */
export const MONTHS_WITH_31_DAYS = new Set([0, 2, 4, 6, 7, 9, 11]);

/** Rows in the date block. Each row holds the dates congruent mod 7. */
export const DATE_ROWS = 7;
/** Columns in the date block: 1..31 laid out in 7 rows of 5. */
export const DATE_COLS = 5;

/** The weekday a month begins on. 0 = Sunday, matching `Date.prototype.getDay`. */
export const firstWeekdayOf = (year: number, monthIndex: number): number =>
  new Date(year, monthIndex, 1).getDay();

/** How many days a month actually has, leap years included. */
export const daysInMonth = (year: number, monthIndex: number): number =>
  new Date(year, monthIndex + 1, 0).getDate();

export const isLeapYear = (year: number): boolean => daysInMonth(year, 1) === 29;

/**
 * The seven columns of the month block: column `w` holds every month that
 * begins on weekday `w`.
 *
 * Every column is always non-empty. The twelve cumulative month-length offsets
 * mod 7 cover all seven residues in both common and leap years, so no weekday
 * ever goes without a month — which is why callers may index `[0]` safely.
 */
export const monthColumnsFor = (year: number): number[][] => {
  const columns: number[][] = Array.from({ length: 7 }, () => []);
  for (let m = 0; m < 12; m++) columns[firstWeekdayOf(year, m)].push(m);
  return columns;
};

/**
 * The weekday shown at a cell of the 7x7 block.
 *
 * The entire block is this one expression: row `r` is the week rotated left by
 * `r`, because a month starting on weekday `c` puts its (r+1)th day on `c + r`.
 */
export const weekdayAt = (row: number, col: number): number => (col + row) % 7;

/** The date row a day-of-month falls in, inverse of {@link datesInRow}. */
export const rowForDate = (date: number): number => (date - 1) % 7;

/** The column a month sits in — the weekday it starts on. */
export const columnForMonth = (year: number, monthIndex: number): number =>
  firstWeekdayOf(year, monthIndex);

/**
 * Every day-of-month in a date row: 1..31 stepping by 7.
 *
 * `limit` clips to a real month length. The grid's date axis is month-agnostic
 * — every column shows 1..31 — so anything that resolves a row to actual dates
 * has to pass the month's length or it will happily claim a 31st of September.
 */
export const datesInRow = (row: number, limit = 31): number[] => {
  const dates: number[] = [];
  for (let k = 0; k < DATE_COLS; k++) {
    const date = row + 1 + k * 7;
    if (date <= limit) dates.push(date);
  }
  return dates;
};

/** The day-of-month shown at a cell of the date block, or null past 31. */
export const dateAt = (row: number, col: number): number | null => {
  const date = row + 1 + col * 7;
  return date > 31 ? null : date;
};

/**
 * Whether a (month, date) is strictly before today.
 *
 * This exists because the obvious version is wrong. The date block is shared by
 * all twelve months, so comparing day-of-month alone — the old `num <
 * currentDate` — dims the 3rd of December as readily as the 3rd of January.
 * A real comparison needs the month, which is only available once one is
 * selected; callers pass `null` when none is, and get `false`.
 */
export const isBeforeToday = (
  year: number,
  monthIndex: number | null,
  date: number,
  today: Date,
): boolean => {
  if (monthIndex === null) return false;
  if (year !== today.getFullYear()) return year < today.getFullYear();
  if (monthIndex !== today.getMonth()) return monthIndex < today.getMonth();
  return date < today.getDate();
};
