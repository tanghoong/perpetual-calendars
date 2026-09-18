/**
 * The whole calendar, as pure functions over indices.
 *
 * Nothing here touches React, the DOM, or a translated string — a month is an
 * index 0..11 and a weekday is an index 0..6, which is what lets a new language
 * be one table entry rather than a second copy of this logic. It is also what
 * makes the arithmetic testable, and this is the part that must never be wrong:
 * a calendar that is off by one is worse than no calendar.
 *
 * Nothing here touches `Date` either, any more. The earlier version asked
 * `new Date(year, month, 1).getDay()` where each month started, which is correct
 * only while the year stays in a narrow band: `new Date(26, 0, 1)` is **1926**,
 * because the two-digit-year legacy of the `Date` constructor maps 0..99 into
 * 1900..1999. That made a perpetual calendar impossible to build on top of it.
 * What replaces it is modular arithmetic over the proleptic Gregorian calendar,
 * which is exact at any year magnitude.
 */

/** Months with 31 days, by index. */
export const MONTHS_WITH_31_DAYS = new Set([0, 2, 4, 6, 7, 9, 11]);

/** Rows in the date block. Each row holds the dates congruent mod 7. */
export const DATE_ROWS = 7;
/** Columns in the date block: 1..31 laid out in 7 rows of 5. */
export const DATE_COLS = 5;

/** Common-year month lengths. February is corrected for leap years. */
const MONTH_LENGTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** Days elapsed before each month in a common year: the running sum above. */
const DAYS_BEFORE_MONTH = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];

/**
 * The first year this calendar is claimed to be right about.
 *
 * The Gregorian calendar began on 15 October 1582, so 1583 is the first
 * complete Gregorian year. The arithmetic below is *proleptic* — it would
 * happily extend backwards — but the answers it gave would not match the dates
 * people actually recorded, which is a worse failure than refusing.
 */
export const FIRST_GREGORIAN_YEAR = 1583;
/** Four digits, which is as far as `Intl` formats a year without notation. */
export const LAST_SUPPORTED_YEAR = 9999;

/** Proleptic Gregorian leap rule. Exact for any safe integer year. */
export const isLeapYear = (year: number): boolean =>
  (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

/** How many days a month actually has, leap years included. */
export const daysInMonth = (year: number, monthIndex: number): number =>
  monthIndex === 1 && isLeapYear(year) ? 29 : MONTH_LENGTHS[monthIndex];

/** Days from 1 January of year 1 to 1 January of `year`, proleptic Gregorian. */
const daysBeforeYear = (year: number): number => {
  const y = year - 1;
  return 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400);
};

/**
 * The weekday 1 January falls on. 0 = Sunday, matching `Date.prototype.getDay`.
 *
 * The year is folded into 1..400 first. The Gregorian calendar repeats **exactly**
 * every 400 years — 146,097 days, which is 20,871 weeks with no remainder — so
 * this changes no answer, and it keeps the day count small enough to stay exact
 * in a double however large the year gets. 1 January of year 1 was a Monday.
 */
export const jan1Weekday = (year: number): number => {
  const folded = ((((year - 1) % 400) + 400) % 400) + 1;
  return (1 + daysBeforeYear(folded)) % 7;
};

/** The weekday a month begins on, from a year's shape rather than the year. */
const firstWeekdayIn = (startWeekday: number, leap: boolean, monthIndex: number): number =>
  (startWeekday + DAYS_BEFORE_MONTH[monthIndex] + (leap && monthIndex > 1 ? 1 : 0)) % 7;

/** The weekday a month begins on. 0 = Sunday. */
export const firstWeekdayOf = (year: number, monthIndex: number): number =>
  firstWeekdayIn(jan1Weekday(year), isLeapYear(year), monthIndex);

/** The weekday a specific date falls on. 0 = Sunday. */
export const weekdayOf = (year: number, monthIndex: number, date: number): number =>
  (firstWeekdayOf(year, monthIndex) + date - 1) % 7;

/* ------------------------------------------------------------------ *
 * Calendar types — the fourth axis
 * ------------------------------------------------------------------ */

/**
 * How many distinct calendars a year can be. Exactly fourteen, forever.
 *
 * Seven common years, one for each weekday January can start on, and seven leap
 * years. This is the fact a perpetual calendar rests on, and it matters more in
 * this layout than in any other: here the arrangement of the twelve month chips
 * *is* the picture, so two years of the same type render an identical grid. On a
 * conventional twelve-block calendar the same is true, but you would have to
 * overlay twelve grids to notice.
 */
export const CALENDAR_TYPE_COUNT = 14;

/** A year's type: 0..6 for common years by starting weekday, 7..13 for leap. */
export const calendarTypeOf = (year: number): number =>
  jan1Weekday(year) + (isLeapYear(year) ? 7 : 0);

export const isLeapType = (type: number): boolean => type >= 7;
/** The weekday 1 January falls on, for a type. */
export const startWeekdayOfType = (type: number): number => type % 7;

const LETTERS = 'ABCDEFG';

/**
 * The type's dominical letter — the traditional name for exactly this concept.
 *
 * Letters run A..G through 1..7 January; the dominical letter is the one landing
 * on the year's first Sunday. A leap year gets two, because 29 February shifts
 * every later date back one weekday: the first letter serves January and
 * February, the second serves March onwards. 2026 is D; 2024 is GF.
 */
export const dominicalLetterOf = (type: number): string => {
  const first = (7 - startWeekdayOfType(type)) % 7;
  return isLeapType(type) ? `${LETTERS[first]}${LETTERS[(first + 6) % 7]}` : LETTERS[first];
};

/**
 * The seven columns of the month block: column `w` holds every month that
 * begins on weekday `w`.
 *
 * Every column is always non-empty. The twelve cumulative month-length offsets
 * mod 7 cover all seven residues in both common and leap years, so no weekday
 * ever goes without a month — which is why callers may index `[0]` safely.
 */
export const monthColumnsForType = (type: number): number[][] => {
  const columns: number[][] = Array.from({ length: 7 }, () => []);
  const start = startWeekdayOfType(type);
  const leap = isLeapType(type);
  for (let m = 0; m < 12; m++) columns[firstWeekdayIn(start, leap, m)].push(m);
  return columns;
};

/** The same thing keyed by year, which is what the grid actually renders. */
export const monthColumnsFor = (year: number): number[][] =>
  monthColumnsForType(calendarTypeOf(year));

/**
 * The years around `year` whose grid is identical to it — the perpetual claim,
 * made concrete.
 *
 * Walks outward rather than scanning a fixed window, because the two kinds of
 * type do not recur at remotely the same rate: a common-year type comes back
 * about every 6 or 11 years, a leap-year type only every 28, and across a
 * century boundary that stretches to 40. A fixed window would return fifteen
 * years for one and three for the other.
 *
 * This list also answers the lookup no conventional calendar can: every year
 * here puts *every* date on the same weekday, so once you have found the year
 * your birthday is a Saturday, these are all the others.
 */
export const sameGridYears = (
  year: number,
  { before, after, min, max }: { before: number; after: number; min: number; max: number },
): number[] => {
  const type = calendarTypeOf(year);
  const earlier: number[] = [];
  for (let y = year - 1; y >= min && earlier.length < before; y--) {
    if (calendarTypeOf(y) === type) earlier.push(y);
  }
  const later: number[] = [];
  for (let y = year + 1; y <= max && later.length < after; y++) {
    if (calendarTypeOf(y) === type) later.push(y);
  }
  return [...earlier.reverse(), year, ...later];
};

/**
 * The year closest to `from` that renders a given type's grid.
 *
 * What a type picker needs: a type is a shape, but everything else in this app
 * is keyed by year, so choosing a shape has to land on a concrete year. Walks
 * outward from `from` and prefers the future on a tie, because "the next year
 * that looks like this" is the more useful of two equally-close answers.
 *
 * Returns null only if the range holds no year of that type at all, which takes
 * a range narrower than 40 years to arrange.
 */
export const nearestYearOfType = (
  type: number,
  from: number,
  min: number,
  max: number,
): number | null => {
  for (let step = 0; step <= max - min; step++) {
    const later = from + step;
    if (later <= max && calendarTypeOf(later) === type) return later;
    const earlier = from - step;
    if (earlier >= min && calendarTypeOf(earlier) === type) return earlier;
  }
  return null;
};

/**
 * Every year in a range where a given date falls on a given weekday.
 *
 * The fourth reverse lookup — "which years is my birthday a Saturday?" — and the
 * proof that {@link sameGridYears} answers it too. A date in February is the one
 * case where the two differ: 29 February exists only in leap years, so the
 * answer is a subset of one type rather than a whole type.
 */
export const yearsWhere = (
  monthIndex: number,
  date: number,
  weekday: number,
  min: number,
  max: number,
): number[] => {
  const years: number[] = [];
  for (let y = min; y <= max; y++) {
    if (date > daysInMonth(y, monthIndex)) continue;
    if (weekdayOf(y, monthIndex, date) === weekday) years.push(y);
  }
  return years;
};

/* ------------------------------------------------------------------ *
 * The grid itself
 * ------------------------------------------------------------------ */

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

/**
 * The column whose cells show `weekday` in a given row — the inverse of
 * {@link weekdayAt} solved for the column.
 *
 * This is the reverse lookup the layout exists for: "which months is the 15th a
 * Wednesday?" is the 15th's row, this column, and the months standing in it. A
 * stack of twelve month-grids can only answer that by checking twelve grids.
 */
export const columnForWeekdayInRow = (weekday: number, row: number): number =>
  (weekday - row + 7) % 7;

/**
 * The row whose cells show `weekday` in a given column — the same inverse
 * solved for the row instead. Answers "which dates in September are Fridays?".
 */
export const rowForWeekdayInColumn = (weekday: number, col: number): number =>
  (weekday - col + 7) % 7;

/** A selection of any two of the three axes. */
export interface AxisSelection {
  month: number | null;
  date: number | null;
  weekday: number | null;
}

/**
 * Resolves a selection to the crosshair it implies.
 *
 * A column comes from a month directly, or from solving the grid when a date
 * and a weekday are held instead; a row likewise. Whichever axis was *not*
 * picked is the answer — which is why this one function serves the forward
 * lookup and both reverse ones.
 *
 * Returns nulls for an axis that cannot be determined: a lone date fixes a row
 * but no column, and a lone weekday fixes neither.
 */
export const resolveCrosshair = (
  year: number,
  { month, date, weekday }: AxisSelection,
): { col: number | null; row: number | null } => {
  const colFromMonth = month === null ? null : columnForMonth(year, month);
  const rowFromDate = date === null ? null : rowForDate(date);
  return {
    col:
      colFromMonth ??
      (weekday !== null && rowFromDate !== null
        ? columnForWeekdayInRow(weekday, rowFromDate)
        : null),
    row:
      rowFromDate ??
      (weekday !== null && colFromMonth !== null
        ? rowForWeekdayInColumn(weekday, colFromMonth)
        : null),
  };
};
