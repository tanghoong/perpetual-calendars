import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowCounterclockwise,
  Checkmark,
  ChevronLeft,
  ChevronRight,
  Printer,
  ShareUp,
  XMark,
} from './icons';
import {
  calendarTypeOf,
  columnForMonth,
  dateAt,
  datesInRow,
  daysInMonth,
  dominicalLetterOf,
  FIRST_GREGORIAN_YEAR,
  isBeforeToday,
  isLeapType,
  LAST_SUPPORTED_YEAR,
  MONTHS_WITH_31_DAYS,
  monthColumnsFor,
  resolveCrosshair,
  rowForDate,
  sameGridYears,
  startWeekdayOfType,
  weekdayAt,
  weekdayOf,
} from '../lib/calendar';
import { formatDate, formatList } from '../lib/format';
import { fill, LANGUAGES, LOCALES, translations, type Language } from '../lib/i18n';
import { readViewState, syncUrl } from '../lib/urlState';

/**
 * The selection: month, date and weekday, each independently optional.
 *
 * The grid is month-column x date-row = weekday, and **any two of the three fix
 * the third**. Holding all three is what makes the reverse lookups possible —
 * and the reverse is the thing this layout can do that a stack of twelve
 * month-grids cannot:
 *
 *   month + date     -> the weekday            "what day is 2 September?"
 *   date + weekday   -> the months             "which months is the 15th a Wednesday?"
 *   month + weekday  -> the dates              "which days in September are Fridays?"
 *
 * Only two can ever be explicit, because the third is then determined. Picking
 * a third drops the oldest, which is what `order` tracks — a most-recently-used
 * queue of at most two axes.
 */
type Axis = 'month' | 'date' | 'weekday';

interface Selection {
  month: number | null;
  date: number | null;
  weekday: number | null;
}

interface Pinned extends Selection {
  /** Least recent first. At most two entries. */
  order: Axis[];
}

const EMPTY: Selection = { month: null, date: null, weekday: null };
const EMPTY_PIN: Pinned = { ...EMPTY, order: [] };

/** Written out rather than computed so the value type stays `number | null`
    instead of widening through a computed key. */
const withAxis = (s: Pinned, axis: Axis, value: number | null): Pinned =>
  axis === 'month'
    ? { ...s, month: value }
    : axis === 'date'
      ? { ...s, date: value }
      : { ...s, weekday: value };

// Every cell is a fixed-height row box holding the painted tile. The split
// matters:
//
//   CELL fixes the row height, which is what keeps the 5-column date block and
//   the 7-column weekday block on the same baseline — their column widths differ
//   by a hair because they divide their gaps differently, so anything that let
//   height follow width would drift the two blocks apart down the grid.
//
//   TILE is the painted shape, and it fills the cell exactly: full width, full
//   height, square corners. It used to be a circle sized off `aspect-square`,
//   which had two problems. The cosmetic one: circles can only meet at a point,
//   so a lit row read as a row of separate dots rather than as a row. The
//   structural one: taking height from *column* width meant the shape outgrew
//   its fixed row wherever a column got wide, which is what happens on the
//   desktop layout — and the month chips overlapped each other.
//
//   Filling the cell fixes both, and the grids then drop their gaps entirely so
//   the tiles abut. That is what makes the crosshair read as one continuous band
//   through the grid rather than a dotted line of hints — which is what the
//   layout actually means. Rounding belongs to the controls around the grid;
//   inside it, square corners are what let the band close up. Nothing is lost by
//   removing the gaps, because an unlit tile paints nothing: the separation that
//   used to come from gaps now comes from there being no fill to separate.
//
// Splitting CELL from TILE still keeps the tap target at the full row height.
//
// The row height steps with the breakpoint so the cell stays near-square at each
// one — the grid's width comes from its container, and only the height is ours
// to pick. At 320px each of the seven weekday columns gets ~21px against a 32px
// row, and 10px tracking-tight text fits where 11px does not; at `sm` the 32rem
// cap puts the column at ~36px against a 36px row; on the desktop layout the
// card is wider, so the row grows to 48 to meet it.
const CELL = 'flex h-8 w-full items-center justify-center sm:h-9 lg:h-12';
const TILE = 'flex h-full w-full items-center justify-center transition-colors';
const DATE_TEXT = 'text-[11px] sm:text-[13px] lg:text-[15px]';
const LABEL_TEXT =
  'text-[10px] tracking-tight sm:text-[12px] sm:tracking-normal lg:text-[14px]';

// iOS control surface: dims on press rather than flashing a highlight.
const PRESSABLE = 'select-none transition active:opacity-55';
const FOCUS_RING =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ios-blue';
const CELL_FOCUS =
  'group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-ios-blue';

// The year range, which is now the calendar's real range rather than a window
// around today. A perpetual calendar has no sliding bound; what it does have is
// a first year it can honestly claim to be right about, and that is the year the
// Gregorian calendar was fully in effect.
const MIN_YEAR = FIRST_GREGORIAN_YEAR;
const MAX_YEAR = LAST_SUPPORTED_YEAR;
const YEAR_BOUNDS = { min: MIN_YEAR, max: MAX_YEAR };

// The picker cannot list 8,417 years, so it lists a window — centred on the
// current year rather than on today, which is what lets the steppers run to the
// bounds without the value ever falling outside its own option list.
const PICKER_SPAN = 60;

// How many same-grid years to offer either side. Five is enough to cross a
// century boundary for a common-year type, where they recur every 6 or 11 years,
// without making the strip unreadable for a leap-year type, where they do not.
const SAME_GRID_NEIGHBOURS = 5;

const CalendarBuilder = () => {
  // One Date for the life of the component: it feeds memo dependencies, and a
  // fresh object every render would defeat them.
  const [today] = useState(() => new Date());
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const currentDate = today.getDate();

  // Lazy initialisers: the URL is read once on mount, not on every render.
  const [initial] = useState(() =>
    readViewState(window.location.search, currentYear, YEAR_BOUNDS),
  );
  const [year, setYear] = useState(initial.year);
  // Seeded from ?lang= and then owned by the switcher. It stays in the URL, so
  // a language choice survives a reload and travels with a shared link.
  const [language, setLanguage] = useState<Language>(initial.language);
  const [pinned, setPinned] = useState<Pinned>(() => ({
    month: initial.month,
    date: initial.date,
    weekday: initial.weekday,
    order: (['month', 'date', 'weekday'] as Axis[]).filter(a => initial[a] !== null),
  }));
  const [hovered, setHovered] = useState<Selection>(EMPTY);

  const t = translations[language];

  useEffect(() => {
    syncUrl(
      {
        year,
        language,
        month: pinned.month,
        date: pinned.date,
        weekday: pinned.weekday,
      },
      currentYear,
    );
  }, [year, language, pinned, currentYear]);

  const monthColumns = useMemo(() => monthColumnsFor(year), [year]);
  const monthRowCount = Math.max(...monthColumns.map(col => col.length));

  // The fourth axis. A year contributes exactly one thing to this layout — the
  // arrangement of the twelve month chips — and there are only fourteen of those,
  // so every year is one of fourteen. The strip below names the neighbours that
  // share this one, which is the whole perpetual claim in a single row.
  const calendarType = calendarTypeOf(year);
  const typePhrase = fill(
    isLeapType(calendarType) ? t.leapYearStarting : t.commonYearStarting,
    t.weekdaysLong[startWeekdayOfType(calendarType)],
  );
  const sameGrid = useMemo(
    () =>
      sameGridYears(year, {
        before: SAME_GRID_NEIGHBOURS,
        after: SAME_GRID_NEIGHBOURS,
        min: MIN_YEAR,
        max: MAX_YEAR,
      }),
    [year],
  );

  // Centred on `year`, so stepping or jumping can never leave the value outside
  // its own option list — which would render the select blank.
  const yearOptions = useMemo(() => {
    const from = Math.max(MIN_YEAR, year - PICKER_SPAN);
    const to = Math.min(MAX_YEAR, year + PICKER_SPAN);
    return Array.from({ length: to - from + 1 }, (_, i) => from + i);
  }, [year]);

  // Each axis resolves independently, and a pin beats a hover on its own axis.
  // That is what makes "pin the month, then sweep the dates" work: the pinned
  // column stays lit while the hovered row moves.
  const activeMonth = pinned.month ?? hovered.month;
  const activeWeekday = pinned.weekday ?? hovered.weekday;
  const hasPin = pinned.order.length > 0;

  // Once a month is known, the date axis stops being month-agnostic: 30 and 31
  // are simply not dates in September, and 29 is not one in most Februaries.
  const dateLimit = activeMonth === null ? 31 : daysInMonth(year, activeMonth);

  // A date the active month does not have counts as no date at all. Clamping it
  // to the month's last day would be worse than dropping it: hovering September
  // with the 31st held would silently relabel the selection "30 September", a
  // date the reader never picked. Dropping it shows the 31st struck through and
  // the heading falling back to the month, which is the truth.
  const heldDate = pinned.date ?? hovered.date;
  const activeDate = heldDate !== null && heldDate <= dateLimit ? heldDate : null;

  // Resolving the crosshair is where the third axis pays off: the answer is
  // whichever axis was *not* picked. Resolved twice — once for what is shown
  // (pin merged with hover) and once for the pin alone, because "is this cell
  // already selected?" must not be answered by a hover that is, by definition,
  // sitting on the cell being clicked.
  const { col: activeCol, row: activeRow } = resolveCrosshair(year, {
    month: activeMonth,
    date: activeDate,
    weekday: activeWeekday,
  });
  const pinnedCross = resolveCrosshair(year, pinned);

  const showToday = year === currentYear;
  const todayCol = columnForMonth(year, currentMonth);
  const todayRow = rowForDate(currentDate);

  /**
   * Sets one axis, toggling it off if it already holds this value.
   *
   * Two axes determine the third, so a third explicit pick would over-specify
   * the selection — and could contradict it. Rather than refuse the click, the
   * oldest axis is dropped, which makes the grid behave the way the reader
   * expects: whatever you just touched is part of the question.
   */
  const selectAxis = (axis: Axis, value: number) =>
    setPinned(p => {
      if (p[axis] === value) {
        return withAxis({ ...p, order: p.order.filter(a => a !== axis) }, axis, null);
      }
      const order = [...p.order.filter(a => a !== axis), axis];
      let next = withAxis({ ...p, order }, axis, value);
      if (order.length > 2) {
        next = withAxis({ ...next, order: order.slice(1) }, order[0], null);
      }
      // Pinning a month also drops a date that month cannot have, so the pinned
      // state never holds an impossible pair.
      if (next.date !== null && next.month !== null && next.date > daysInMonth(year, next.month)) {
        next = withAxis({ ...next, order: next.order.filter(a => a !== 'date') }, 'date', null);
      }
      return next;
    });

  const monthForColumn = (col: number): number => {
    const months = monthColumns[col];
    return showToday && months.includes(currentMonth) ? currentMonth : months[0];
  };
  // A weekday cell fixes the column. The date is the row's first *unless* one
  // is already held in that row — clicking the "Wed" cell while the 15th is
  // selected must not silently reset the selection to the 1st, because the
  // reader is asking about the 15th.
  const selectionForCell = (row: number, col: number): Selection => ({
    month: monthForColumn(col),
    date: pinned.date !== null && rowForDate(pinned.date) === row ? pinned.date : row + 1,
    weekday: null,
  });
  const toggleCell = (row: number, col: number) => {
    if (pinnedCross.row === row && pinnedCross.col === col) {
      setPinned(EMPTY_PIN);
      return;
    }
    const { month, date } = selectionForCell(row, col);
    // A cell names a month and a date, so the weekday it implies is dropped:
    // holding all three would be over-specified.
    setPinned({ month, date, weekday: null, order: ['month', 'date'] });
  };

  const clear = () => {
    setPinned(EMPTY_PIN);
    setHovered(EMPTY);
  };

  // The document language drives screen-reader pronunciation and the browser's
  // own offer to translate. It was pinned to "en" in index.html while the page
  // could already render Chinese, Malay or Vietnamese from ?lang=.
  useEffect(() => {
    document.documentElement.lang = LOCALES[language];
  }, [language]);

  /**
   * Shares the current view.
   *
   * `urlState` has been mirroring the whole selection into the address bar all
   * along, but nothing in the UI said so, which made a shareable view a feature
   * only its author knew about. The native sheet is the right affordance where
   * it exists — on iOS it is how anything gets shared — and a clipboard copy is
   * the fallback everywhere else.
   */
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(id);
  }, [copied]);

  const share = async () => {
    const url = window.location.href;
    if (typeof navigator.share === 'function') {
      // A dismissed share sheet rejects. That is the user declining, not a
      // failure, so it must not fall through to a surprise clipboard write.
      try {
        await navigator.share({ title: t.title, text: headline, url });
      } catch {
        /* dismissed */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // Clipboard access is permission-gated and absent over plain HTTP. There
      // is nothing useful to say: the address bar already holds the same link.
    }
  };

  /**
   * Shortcuts: the questions worth one tap.
   *
   * Deliberately culture-neutral — a hardcoded Christmas would be noise for
   * three of the four languages this ships in. "Friday the 13th" earns its
   * place by being the reverse lookup in its purest form: a date and a weekday,
   * answered by a set of months, which is the query a conventional calendar is
   * worst at.
   */
  const presets: { key: string; label: string; apply: () => void }[] = [
    {
      key: 'today',
      label: t.todayLabel,
      apply: () => {
        setYear(currentYear);
        setPinned({
          month: currentMonth,
          date: currentDate,
          weekday: null,
          order: ['month', 'date'],
        });
      },
    },
    {
      key: 'friday13',
      label: `${t.weekdaysLong[5]} 13`,
      apply: () => setPinned({ month: null, date: 13, weekday: 5, order: ['date', 'weekday'] }),
    },
    {
      key: 'newyear',
      // Formatted rather than translated: Intl already knows what 1 January is
      // called in every locale here.
      label: formatDate(LOCALES[language], 'dayMonthShort', new Date(year, 0, 1)),
      apply: () => setPinned({ month: 0, date: 1, weekday: null, order: ['month', 'date'] }),
    },
  ];

  // Mouse only. Touch browsers synthesize a hover that persists after the tap,
  // which would outlive an unpin and leave the crosshair lit with nothing
  // selected.
  const hoverIfMouse = (e: { pointerType: string }, selection: Selection) => {
    if (e.pointerType === 'mouse') setHovered(s => ({ ...s, ...selection }));
  };

  /**
   * Roving tabindex over the 7x7 weekday block.
   *
   * Every cell was a tab stop, which put 49 of them in this block alone and 99
   * across the page — so reaching the grid's far corner by keyboard took more
   * presses than reading the answer off a wall calendar would have. The ARIA
   * grid pattern is one tab stop for the whole block, with the arrows moving
   * inside it.
   *
   * Movement wraps, which is not the usual choice but is the right one here:
   * this block *is* a cyclic group. Row r is the week rotated left by r and
   * column c likewise, so stepping off the last column onto the first is the
   * same relationship every other step expresses, not an edge case.
   */
  const [roving, setRoving] = useState({ row: 0, col: 0 });
  const cellRefs = useRef(new Map<string, HTMLButtonElement | null>());

  const moveRoving = (row: number, col: number) => {
    setRoving({ row, col });
    cellRefs.current.get(`${row}-${col}`)?.focus();
  };

  const STEPS: Record<string, [number, number]> = {
    ArrowUp: [-1, 0],
    ArrowDown: [1, 0],
    ArrowLeft: [0, -1],
    ArrowRight: [0, 1],
  };

  const onGridKeyDown = (e: React.KeyboardEvent, row: number, col: number) => {
    const step = STEPS[e.key];
    if (step) {
      e.preventDefault();
      moveRoving((row + step[0] + 7) % 7, (col + step[1] + 7) % 7);
      return;
    }
    if (e.key === 'Home') {
      e.preventDefault();
      moveRoving(e.ctrlKey ? 0 : row, 0);
    } else if (e.key === 'End') {
      e.preventDefault();
      moveRoving(e.ctrlKey ? 6 : row, 6);
    }
  };

  // The tab stop follows the selection where there is one, so tabbing back into
  // the grid returns to the cell the reader was last working with rather than
  // to the corner.
  const rovingRow = pinnedCross.row ?? roving.row;
  const rovingCol = pinnedCross.col ?? roving.col;

  /**
   * Jumps to a whole date at once, from the platform's own date picker.
   *
   * A native `<input type="date">` rather than parsed text: it brings the iOS
   * wheel and the Android calendar for free, validates itself, and renders in
   * the reader's own locale order — none of which four hand-written parsers
   * would have got right.
   */
  const goToDate = (value: string) => {
    // Empty is the clear button inside the native control.
    if (value === '') {
      clear();
      return;
    }
    const [y, m, d] = value.split('-').map(Number);
    if (!Number.isInteger(y) || y < MIN_YEAR || y > MAX_YEAR) return;
    setYear(y);
    setPinned({ month: m - 1, date: d, weekday: null, order: ['month', 'date'] });
  };

  /**
   * The explainer's worked example, computed rather than written.
   *
   * Christmas is the date the README has always used, but the point here is
   * only that it is a fixed date whose weekday moves with the year — so the
   * illustration stays true when the reader steps the year, which a hardcoded
   * "Dec 25 is a Friday" would not.
   */
  const example = {
    // LOCALES[language] rather than the `locale` binding below: this runs at its
    // own declaration, which is above that one.
    date: formatDate(LOCALES[language], 'dayMonthShort', new Date(year, 11, 25)),
    weekday: t.weekdaysLong[weekdayOf(year, 11, 25)],
  };

  // The control shows a date only when one is actually pinned; a hover must not
  // rewrite the input under the reader's cursor.
  const dateInputValue =
    pinned.month !== null && pinned.date !== null
      ? `${String(year).padStart(4, '0')}-${String(pinned.month + 1).padStart(2, '0')}-${String(
          pinned.date,
        ).padStart(2, '0')}`
      : '';


  // The heading is the lookup, and which of the three questions it answers
  // depends on which two axes are held. The two reverse cases are the ones a
  // conventional calendar cannot answer without checking twelve grids.
  const locale = LOCALES[language];
  let headline: string;
  if (activeMonth !== null && activeDate !== null) {
    // Forward: a single real date.
    headline = formatDate(locale, 'fullDate', new Date(year, activeMonth, activeDate));
  } else if (activeMonth !== null && activeWeekday !== null && activeRow !== null) {
    // Reverse: every date in this month that falls on this weekday.
    const dates = datesInRow(activeRow, dateLimit);
    headline = `${formatDate(locale, 'monthYear', new Date(year, activeMonth, 1))} · ${
      t.weekdaysLong[activeWeekday]
    } · ${dates.join(', ')}`;
  } else if (activeDate !== null && activeWeekday !== null && activeCol !== null) {
    // Reverse: every month in which this date falls on this weekday. This is
    // the question the whole layout is built to answer at a glance.
    const matches = monthColumns[activeCol]
      .filter(m => daysInMonth(year, m) >= activeDate)
      .map(m => formatDate(locale, 'dayMonthShort', new Date(year, m, activeDate)));
    headline = `${t.weekdaysLong[activeWeekday]} · ${formatList(locale, matches)}`;
  } else if (activeMonth !== null) {
    // A column *means* "months that start on this weekday", so the month's 1st
    // is the fact the column is actually asserting.
    headline = formatDate(locale, 'fullDate', new Date(year, activeMonth, 1));
  } else if (activeWeekday !== null) {
    headline = t.weekdaysLong[activeWeekday];
  } else if (activeDate !== null) {
    // A row alone cannot name a weekday — that is the missing half, so say so.
    headline = t.pickMonth;
  } else if (showToday) {
    headline = formatDate(locale, 'fullDate', today);
  } else {
    headline = t.title;
  }

  // The other months in the selected column share its starting weekday, so the
  // same date in each of them falls on the same weekday. That set is the answer
  // to the inverse question — "which months is the 15th a Wednesday?" — and it
  // is the one thing a stack of twelve month-grids cannot show you at a glance.
  // Naming only the first month would throw away the point of the layout.
  const alsoDates =
    activeMonth !== null && activeDate !== null && activeCol !== null
      ? monthColumns[activeCol]
          .filter(m => m !== activeMonth && daysInMonth(year, m) >= activeDate)
          .map(m => formatDate(LOCALES[language], 'dayMonthShort', new Date(year, m, activeDate)))
      : [];

  return (
    <div className="min-h-dvh bg-ios-bg font-ios text-ios-label antialiased">
      {/* Padding is tight on phones and opens up from `sm`, because the mobile
          width is what the grid has to fit into. The safe-area insets keep the
          title clear of a notch and the footer clear of the home indicator when
          this is saved to the Home Screen. */}
      {/* One column on phones, two from `lg`. The desktop layout exists because
          a phone-width column centred in a 1440px window wastes both margins:
          the controls move into a left rail and the grid takes the space it
          frees, so the whole lookup is visible without scrolling. Placement is
          grid areas rather than duplicated markup, so the DOM order — and with
          it the tab order and the screen-reader order — stays the reading
          order at every width. */}
      <div className="mx-auto w-full max-w-lg px-3 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(1.5rem+env(safe-area-inset-top))] sm:px-5 lg:grid lg:max-w-4xl lg:grid-cols-[15rem_1fr] lg:grid-rows-[auto_auto_auto_auto_auto_1fr_auto] lg:items-start lg:gap-x-8 lg:gap-y-4">
        {/* aria-live announces the resolved date as focus moves through the
            grid, which is what turns the crosshair into something a screen
            reader can follow. min-h reserves two lines so stepping between
            cells does not shunt the page up and down under the reader's thumb. */}
        {/* One block, one reserved height, for the whole readout.
            The companion line used to sit below the card, so it pushed the
            weekday row and the footnote down by ~27px every time it appeared —
            and on hover it appears and disappears constantly. Folding it into
            the heading's reserved space means nothing below the heading ever
            moves.

            The reservations are measured, not guessed: the tallest real content
            across all four languages and every selection state is 45px at the
            base size, 65px at `sm` (Vietnamese, three-month reverse lookup) and
            57px at `lg`. Each holds a few pixels of slack over that. */}
        <div
          aria-live="polite"
          className="flex min-h-12 flex-col justify-start sm:min-h-18 lg:col-span-2 lg:min-h-16"
        >
          <h1 className="text-[18px] font-bold leading-tight tracking-[-0.015em] tabular-nums sm:text-[26px]">
            {headline}
          </h1>
          {alsoDates.length > 0 && (
            <p className="mt-1.5 text-[12px] leading-snug text-ios-label-2 sm:text-[13px]">
              <span className="font-semibold text-ios-label-3">{t.alsoLabel}</span>{' '}
              {formatList(LOCALES[language], alsoDates)}
            </p>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 lg:col-start-1 lg:row-start-2 lg:mt-0">
          {/* On paper the year has to be stated, not sat inside a <select> the
              printer renders as an empty box. This is also the only place the
              sheet says what it is: a year, its type, and — from the strip at
              the foot — the other years it is equally valid for. */}
          <p className="hidden text-[20px] font-bold tabular-nums print:block">
            {year}{' '}
            <span className="text-[14px] font-medium">
              · {typePhrase} ({dominicalLetterOf(calendarType)})
            </span>
          </p>
          {/* Year stepper, shaped like an iOS stepper: one filled pill track
              carrying two round glyph buttons with the value between them. The
              value is itself a <select> — a native picker is the fast path off
              the current year, and on iOS it opens the system wheel, so a jump
              of forty years is one gesture instead of forty taps. */}
          <div className="flex shrink-0 items-center rounded-full bg-ios-fill p-1 text-[17px] print:hidden">
            <button
              type="button"
              onClick={() => setYear(y => Math.max(MIN_YEAR, y - 1))}
              disabled={year <= MIN_YEAR}
              aria-label={t.prevYear}
              className={`${PRESSABLE} ${FOCUS_RING} grid h-8 w-8 place-items-center rounded-full text-ios-blue disabled:opacity-30`}
            >
              <ChevronLeft />
            </button>
            <select
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              aria-label={t.yearLabel}
              className={`${PRESSABLE} ${FOCUS_RING} cursor-pointer appearance-none rounded-full bg-transparent px-1 text-center font-semibold tabular-nums ${
                showToday ? 'text-ios-blue' : 'text-ios-label'
              }`}
            >
              {yearOptions.map(y => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setYear(y => Math.min(MAX_YEAR, y + 1))}
              disabled={year >= MAX_YEAR}
              aria-label={t.nextYear}
              className={`${PRESSABLE} ${FOCUS_RING} grid h-8 w-8 place-items-center rounded-full text-ios-blue disabled:opacity-30`}
            >
              <ChevronRight />
            </button>
          </div>

          {/* The header's right half carries both transient actions, which is
              also where iOS puts a navigation bar's trailing controls. Clear is
              icon-only so the two fit at 320px in the longest language. */}
          <div className="flex min-w-0 items-center gap-2 print:hidden">
            {!showToday && (
              <button
                type="button"
                onClick={() => setYear(currentYear)}
                className={`${PRESSABLE} ${FOCUS_RING} flex h-9 min-w-0 items-center gap-1.5 rounded-full bg-ios-blue px-3.5 text-[13px] font-semibold text-white`}
              >
                <ArrowCounterclockwise className="h-[1.15em] w-[1.15em] shrink-0" />
                <span className="truncate">{t.currentYear}</span>
              </button>
            )}
            {hasPin && (
              <button
                type="button"
                onClick={clear}
                aria-label={t.clear}
                className={`${PRESSABLE} ${FOCUS_RING} grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ios-fill text-[15px] text-ios-label-2`}
              >
                <XMark />
              </button>
            )}
            {/* Icon-only, so the header still fits 320px in the longest
                language with the Current Year pill also showing. */}
            <button
              type="button"
              onClick={share}
              aria-label={t.share}
              className={`${PRESSABLE} ${FOCUS_RING} grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ios-fill text-[15px] print:hidden ${
                copied ? 'text-ios-blue' : 'text-ios-label-2'
              }`}
            >
              {copied ? <Checkmark /> : <ShareUp />}
            </button>
          </div>
        </div>

        {/* The third axis, in the slot the language switcher used to occupy.
            A weekday cell inside the grid always implies a row as well, so it
            can never express "I only care about Fridays" — the half of the
            lookup a conventional calendar is worst at. Sitting directly above
            the grid, it now reads as what it is: a filter on the whole board. */}
        <div
          role="group"
          aria-label={t.weekdayLabel}
          className="mt-3 grid grid-cols-7 gap-1 print:hidden lg:col-start-1 lg:row-start-3 lg:mt-0 lg:grid-cols-4"
        >
          {t.weekdays.map((label, weekday) => {
            const isOn = activeWeekday === weekday;
            return (
              <button
                key={weekday}
                type="button"
                aria-pressed={isOn}
                aria-label={t.weekdaysLong[weekday]}
                onPointerEnter={e => hoverIfMouse(e, { ...EMPTY, weekday })}
                onFocus={() => setHovered(s => ({ ...s, weekday }))}
                onBlur={() => setHovered(s => ({ ...s, weekday: null }))}
                onClick={() => selectAxis('weekday', weekday)}
                className={`${PRESSABLE} ${FOCUS_RING} truncate rounded-full py-1.5 text-center text-[11px] font-semibold transition-colors sm:text-[13px] ${
                  isOn
                    ? 'bg-ios-blue text-white'
                    : weekday === 0
                      ? 'bg-ios-fill text-ios-red'
                      : 'bg-ios-fill text-ios-label-2'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Grouped-content card */}
        <div
          className="mt-4 rounded-[1.75rem] bg-ios-card p-2 print:break-inside-avoid print:border print:border-black/10 sm:p-4 lg:col-start-2 lg:row-start-2 lg:row-span-5 lg:mt-0"
          onPointerLeave={() => setHovered(EMPTY)}
        >
          {/* Two blocks side by side, sized 5:7 to match their column counts.
              The gap is what makes the date axis read as separate from the
              weekday axis — in the old single-table layout they looked alike. */}
          <div className="flex gap-1.5 sm:gap-3">
            {/* Dates */}
            <div className="flex-5">
              {/* Mirrors the month grid's shape with the same cell and gap
                  classes, so both blocks start on the same line at every
                  breakpoint without hard-coded offsets. The otherwise dead
                  corner carries the axis label. */}
              <div className="mb-px grid grid-cols-5 sm:mb-1">
                {Array.from({ length: (monthRowCount - 1) * 5 }, (_, i) => (
                  <div key={`pad-${i}`} className={CELL} />
                ))}
                <div
                  className={`${CELL} col-span-5 text-[9px] font-semibold uppercase tracking-[0.06em] text-ios-label-3 sm:text-[11px]`}
                >
                  {t.dates}
                </div>
              </div>

              {/* A named group rather than a second `role="grid"`. The 7x7
                  block below is a grid because its cells are an intersection
                  and it implements the arrow-key pattern that role obliges;
                  these are 31 independent targets with their own meaning, and
                  claiming grid semantics without the keyboard behaviour would
                  be a worse lie than claiming none. */}
              <div
                role="group"
                aria-label={t.dateGridLabel}
                className="grid grid-cols-5"
              >
                {Array.from({ length: 7 }, (_, row) =>
                  Array.from({ length: 5 }, (_, col) => {
                    const num = dateAt(row, col);
                    if (num === null) return <div key={`d-${row}-${col}`} />;

                    // Only real once a month is known — which is exactly why the
                    // month block is selectable.
                    const outOfRange = num > dateLimit;
                    const isSelected = activeDate === num;
                    const isToday =
                      showToday &&
                      num === currentDate &&
                      (activeMonth === null || activeMonth === currentMonth);
                    const isPast = isBeforeToday(year, activeMonth, num, today);
                    const inActiveRow = activeRow === row;
                    // The mirror case: a month and a weekday resolve a row, and
                    // every date in it is an answer.
                    const answering = activeDate === null && activeRow !== null;
                    const isAnswer = answering && inActiveRow && !outOfRange;

                    return (
                      <button
                        key={`d-${row}-${col}`}
                        type="button"
                        disabled={outOfRange}
                        aria-pressed={isSelected}
                        onPointerEnter={e => hoverIfMouse(e, { ...EMPTY, date: num })}
                        onFocus={() => setHovered(s => ({ ...s, date: num }))}
                        onBlur={() => setHovered(s => ({ ...s, date: null }))}
                        onClick={() => selectAxis('date', num)}
                        className={`${CELL} group select-none focus:outline-none`}
                      >
                        <span
                          aria-current={isToday ? 'date' : undefined}
                          className={`${TILE} ${DATE_TEXT} ${CELL_FOCUS} font-medium tabular-nums ${
                            outOfRange
                              ? 'text-ios-label-3 line-through decoration-1 opacity-40'
                              : isSelected || isAnswer
                                ? 'bg-ios-blue font-semibold text-white'
                                : // Today is a ring, not a fill. It used to take
                                  // the same solid blue the selection takes, so
                                  // selecting the 13th put two identical blue
                                  // squares in the block meaning two different
                                  // things — the answer, and today. An outline
                                  // never competes with a fill, so today stays
                                  // findable in every state instead of having to
                                  // stand down whenever something is selected.
                                  isToday
                                  ? `font-semibold text-ios-blue outline-2 -outline-offset-2 outline-ios-blue ${
                                      inActiveRow ? 'bg-ios-blue-soft' : ''
                                    }`
                                  : inActiveRow
                                    ? 'bg-ios-blue-soft text-ios-blue'
                                    : isPast
                                      ? 'text-ios-label-3'
                                      : 'text-ios-label-2 group-hover:bg-ios-fill'
                          } ${num === 31 ? 'underline decoration-2 underline-offset-2' : ''}`}
                        >
                          {num}
                        </span>
                      </button>
                    );
                  }),
                )}
              </div>
            </div>

            {/* Months above, weekdays below — they share the 7 columns */}
            <div className="flex-7">
              <div
                role="group"
                aria-label={t.monthsLabel}
                className="mb-px grid grid-cols-7 sm:mb-1"
              >
                {Array.from({ length: monthRowCount }, (_, row) =>
                  Array.from({ length: 7 }, (_, col) => {
                    const monthIndex = monthColumns[col][row];
                    // A column holds one to three months, so most columns have
                    // empty rows below theirs. Those empties still carry the
                    // column's highlight: the band means "this column", not
                    // "these months", and leaving a hole in it where no month
                    // happens to sit made the crosshair look broken.
                    if (monthIndex === undefined) {
                      return (
                        <div key={`m-${row}-${col}`} className={CELL}>
                          <span
                            className={`${TILE} ${activeCol === col ? 'bg-ios-blue-soft' : ''}`}
                          />
                        </div>
                      );
                    }

                    const isSelected = activeMonth === monthIndex;
                    const isCurrent = showToday && monthIndex === currentMonth;
                    const inActiveCol = activeCol === col;
                    // In a reverse lookup nothing was picked on this axis, so
                    // every month in the resolved column is part of the answer
                    // — and should read as one, not as faint context.
                    const answering = activeMonth === null && activeCol !== null;
                    const isAnswer = answering && inActiveCol;

                    return (
                      <button
                        key={`m-${row}-${col}`}
                        type="button"
                        aria-pressed={isSelected}
                        // Intl rather than a fifth translation table: the grid
                        // labels are abbreviations chosen to fit 12 columns, and
                        // an accessible name should be the real month name.
                        aria-label={formatDate(LOCALES[language], 'monthYear', new Date(year, monthIndex, 1))}
                        onPointerEnter={e => hoverIfMouse(e, { ...EMPTY, month: monthIndex })}
                        onFocus={() => setHovered(s => ({ ...s, month: monthIndex }))}
                        onBlur={() => setHovered(s => ({ ...s, month: null }))}
                        onClick={() => selectAxis('month', monthIndex)}
                        className={`${CELL} group select-none focus:outline-none`}
                      >
                        <span
                          className={`${TILE} ${LABEL_TEXT} ${CELL_FOCUS} overflow-hidden px-px font-semibold ${
                            // While an answer set is on screen the "current
                            // month" marker stands down: two different meanings
                            // sharing one solid fill would read as one answer
                            // set with a stray extra member.
                            //
                            // Unlit months carry no fill. They used to, which
                            // was fine while each chip was a separate circle and
                            // wrong the moment they became squares: twelve tinted
                            // squares abutting each other stopped reading as
                            // twelve chips and started reading as one blue slab,
                            // and a highlight inside a slab says nothing. Blue
                            // text alone still tells the month block apart from
                            // the grey weekday block below it.
                            isSelected || isAnswer
                              ? 'bg-ios-blue text-white'
                              : isCurrent
                                ? `outline-2 -outline-offset-2 outline-ios-blue ${
                                    inActiveCol ? 'bg-ios-blue-soft' : ''
                                  } text-ios-blue`
                                : inActiveCol
                                  ? 'bg-ios-blue-soft text-ios-blue'
                                  : 'text-ios-blue group-hover:bg-ios-fill'
                          } ${
                            MONTHS_WITH_31_DAYS.has(monthIndex)
                              ? 'underline decoration-2 underline-offset-2'
                              : ''
                          }`}
                        >
                          {t.months[monthIndex]}
                        </span>
                      </button>
                    );
                  }),
                )}
              </div>

              {/* A real ARIA grid, not just a CSS one. The layout has always
                  been an intersection of a date row and a month column, and a
                  screen reader was never told so — which was the single thing
                  it most needed to know about this design. The row wrappers use
                  `contents`, so they add the semantics without adding a box. */}
              <div
                role="grid"
                aria-label={t.weekdayGridLabel}
                aria-rowcount={7}
                aria-colcount={7}
                className="grid grid-cols-7"
              >
                {Array.from({ length: 7 }, (_, row) => (
                  <div key={`wr-${row}`} role="row" aria-rowindex={row + 1} className="contents">
                    {Array.from({ length: 7 }, (_, col) => {
                      const weekdayIndex = weekdayAt(row, col);
                      const onCross = activeRow === row || activeCol === col;
                      const atIntersection = activeRow === row && activeCol === col;
                      const noSelection = activeRow === null && activeCol === null;
                      const isTodayCell =
                        noSelection && showToday && row === todayRow && col === todayCol;

                      return (
                        <button
                          key={`w-${row}-${col}`}
                          ref={el => {
                            cellRefs.current.set(`${row}-${col}`, el);
                          }}
                          type="button"
                          role="gridcell"
                          aria-colindex={col + 1}
                          aria-pressed={atIntersection}
                          // One tab stop for the whole block; the arrows do the
                          // rest. Without this the grid alone was 49 of the
                          // page's 99 tab stops.
                          tabIndex={row === rovingRow && col === rovingCol ? 0 : -1}
                          // Name is the weekday alone. The pressed state travels on
                          // aria-pressed, which assistive tech announces in the
                          // user's own locale — spelling it out here would both
                          // duplicate that and hardcode English into a localized name.
                          // Where the cell *sits* now travels on the row and column
                          // indices instead, which is the part that was missing.
                          aria-label={t.weekdaysLong[weekdayIndex]}
                          onKeyDown={e => onGridKeyDown(e, row, col)}
                          onPointerEnter={e => hoverIfMouse(e, selectionForCell(row, col))}
                          onFocus={() => {
                            setRoving({ row, col });
                            setHovered(selectionForCell(row, col));
                          }}
                          onBlur={() => setHovered(EMPTY)}
                          onClick={() => toggleCell(row, col)}
                          // The button keeps the full row height as its tap
                          // target; the disc inside is what gets painted. Focus
                          // and hover are therefore forwarded to the disc, so the
                          // ring traces the circle rather than the taller box.
                          className={`${CELL} group select-none focus:outline-none`}
                        >
                          <span
                            className={`${TILE} ${LABEL_TEXT} ${CELL_FOCUS} font-medium ${
                              atIntersection
                                ? 'bg-ios-blue font-semibold text-white'
                                : isTodayCell
                                  ? 'font-semibold text-ios-blue outline-2 -outline-offset-2 outline-ios-blue'
                                  : onCross
                                    ? 'bg-ios-blue-soft text-ios-blue'
                                    : weekdayIndex === 0
                                      ? 'text-ios-red group-hover:bg-ios-fill'
                                      : 'text-ios-label-2 group-hover:bg-ios-fill'
                            }`}
                          >
                            {t.weekdays[weekdayIndex]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Shortcuts sit with the other controls: below the grid on a phone,
            in the left rail on desktop. Placed before the footnote in the DOM so
            the reading order matches the visual order at both widths. */}
        <div role="group" aria-label={t.presetsLabel} className="mt-3 flex flex-wrap gap-2 px-1 print:hidden lg:col-start-1 lg:row-start-4 lg:mt-0">
          {/* The fast path in, for a reader who already knows the date and
              wants the grid to show them where it lives. A native date input
              rather than a parsed text field: it brings the iOS wheel and the
              Android calendar, validates itself against the bounds, and lays
              its fields out in the reader's own locale order — none of which
              four hand-written parsers would have got right. */}
          <label
            className={`${PRESSABLE} flex items-center gap-1.5 rounded-full bg-ios-fill px-3 py-1.5 text-[12px] font-semibold text-ios-blue has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ios-blue sm:text-[13px] print:hidden`}
          >
            <span className="sr-only">{t.goToDate}</span>
            <input
              type="date"
              value={dateInputValue}
              min={`${MIN_YEAR}-01-01`}
              max={`${MAX_YEAR}-12-31`}
              onChange={e => goToDate(e.target.value)}
              className="w-34 cursor-pointer appearance-none bg-transparent font-semibold tabular-nums text-ios-blue focus:outline-none"
            />
          </label>
          {presets.map(({ key, label, apply }) => (
            <button
              key={key}
              type="button"
              onClick={apply}
              className={`${PRESSABLE} ${FOCUS_RING} rounded-full bg-ios-fill px-3 py-1.5 text-[12px] font-semibold text-ios-blue sm:text-[13px]`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* iOS grouped-list footnote. Clear used to live here; it moved to the
            header, so this is now purely the instruction. */}
        <div className="mt-3 px-1 sm:mt-4 lg:col-start-1 lg:row-start-5 lg:mt-0">
          <p className="text-[12px] leading-relaxed text-ios-label-2 sm:text-[13px] print:hidden">
            {t.hint} <span className="text-ios-label-3">{t.hintTouch}</span>
          </p>

          {/* The layout is unusual enough that a first-time reader sees an
              abstract grid of abbreviations rather than a lookup table. The
              one-line hint above says what to do; this says how it works, and
              closes again so it costs a returning reader nothing.

              A <details> rather than a tour or an animation: no JavaScript, no
              motion, and it cannot fight the "nothing moves" property the rest
              of the layout is built around. The worked example is computed from
              the year on screen, so it is never a stale illustration. */}
          <details className="group mt-2 print:hidden">
            <summary
              className={`${PRESSABLE} ${FOCUS_RING} inline-flex cursor-pointer list-none items-center gap-1 rounded-full text-[12px] font-semibold text-ios-blue sm:text-[13px] [&::-webkit-details-marker]:hidden`}
            >
              <span className="inline-block transition-transform group-open:rotate-90">
                <ChevronRight className="h-[0.9em] w-[0.9em]" />
              </span>
              {t.howToRead}
            </summary>
            <ol className="mt-2 list-inside list-decimal space-y-1 text-[12px] leading-relaxed text-ios-label-2 sm:text-[13px]">
              <li>{t.stepMonth}</li>
              <li>{t.stepDate}</li>
              <li>{t.stepCross}</li>
            </ol>
            <p className="mt-2 text-[12px] leading-relaxed text-ios-label-3 sm:text-[13px]">
              {t.worked}: <span className="font-semibold text-ios-label-2">{example.date}</span>{' '}
              <span aria-hidden="true">→</span>{' '}
              <span className="font-semibold text-ios-blue">{example.weekday}</span>
            </p>
            {/* The one mark on the grid that does not explain itself. It was
                documented only in the README, which is not where someone looking
                at the grid is. */}
            <p className="mt-1.5 text-[12px] leading-relaxed text-ios-label-3 sm:text-[13px]">
              <span className="underline decoration-2 underline-offset-2">{t.months[0]}</span>{' '}
              {t.markerNote}
            </p>
          </details>
        </div>

        {/* Settings, at the foot of the page on a phone and of the left rail on
            desktop. The language control came back here rather than to its old
            slot above the grid, which the weekday filter now owns and earns. */}
        <div className="mt-5 flex items-center gap-2 px-1 print:hidden lg:col-start-1 lg:row-start-6 lg:mt-4">
          {/* Real radio inputs inside a fieldset: it looks like an iOS segmented
              control but keeps native group semantics and native arrow-key
              navigation, which an aria-pressed button set would have to
              reimplement badly. */}
          <fieldset className="min-w-0 flex-1">
            <legend className="sr-only">{t.languageLabel}</legend>
            <div className="flex rounded-full bg-ios-fill p-0.5">
              {LANGUAGES.map(({ id, short }) => {
                const isOn = language === id;
                return (
                  <label
                    key={id}
                    className={`${PRESSABLE} flex-1 cursor-pointer rounded-full py-1.5 text-center text-[12px] font-semibold transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ios-blue sm:text-[13px] ${
                      isOn ? 'bg-ios-thumb text-ios-label shadow-sm' : 'text-ios-label-2'
                    }`}
                  >
                    <input
                      type="radio"
                      name="language"
                      value={id}
                      checked={isOn}
                      onChange={() => setLanguage(id)}
                      className="sr-only"
                    />
                    {short}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <button
            type="button"
            onClick={() => window.print()}
            aria-label={t.print}
            className={`${PRESSABLE} ${FOCUS_RING} grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ios-fill text-[15px] text-ios-label-2`}
          >
            <Printer />
          </button>
        </div>

        {/* The fourth axis, and the only part of this page that argues the word
            "perpetual".

            Everything above answers a question about one year. This says the
            year barely matters: the grid above is one of exactly fourteen, and
            these are the neighbours it also serves. It doubles as the lookup no
            conventional calendar can do at all — every year listed puts *every*
            date on the same weekday, so once you have found the year your
            birthday is a Saturday, these are all the others.

            Full width below both columns on desktop, because eleven year chips
            do not fit a 15rem rail and this is the one block that belongs to the
            whole page rather than to the controls. */}
        <section
          aria-label={t.yearTypeNav}
          className="mt-5 lg:col-span-2 lg:row-start-7 lg:mt-2"
        >
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 px-1">
            <h2 className="text-[12px] font-semibold text-ios-label-2 sm:text-[13px]">
              {t.sameGridAs}
            </h2>
            {/* The dominical letter is the traditional name for precisely this
                classification, so it is worth carrying — quietly, after the
                phrase that actually explains it. */}
            <p className="text-[12px] text-ios-label-3 sm:text-[13px]">
              <span aria-hidden="true">·</span> {typePhrase}{' '}
              <span title={t.calendarTypeLabel}>({dominicalLetterOf(calendarType)})</span>
            </p>
          </div>

          {/* Scrolls rather than wraps: a fixed single row keeps the block's
              height constant as the year changes, and a leap-year type returns
              far fewer neighbours than a common-year one.

              On paper it wraps instead. A scroll container prints only what fits
              the first screenful, which clipped the list at the current year —
              losing precisely the years the printed sheet exists to advertise. */}
          <div className="mt-1.5 flex gap-1.5 overflow-x-auto px-1 pb-1 scrollbar-none print:flex-wrap print:overflow-visible">
            {sameGrid.map(y => {
              const isCurrent = y === year;
              return (
                <button
                  key={y}
                  type="button"
                  onClick={() => setYear(y)}
                  aria-current={isCurrent ? 'true' : undefined}
                  className={`${PRESSABLE} ${FOCUS_RING} shrink-0 rounded-full px-3 py-1.5 text-[13px] font-semibold tabular-nums ${
                    isCurrent ? 'bg-ios-blue text-white' : 'bg-ios-fill text-ios-blue'
                  }`}
                >
                  {y}
                </button>
              );
            })}
          </div>
        </section>
      </div>

      {/* Fixed rather than in flow: a confirmation that shifted the page would
          undo the "nothing moves" property the layout is built around. Only
          reached where there is no native share sheet to speak for itself. */}
      {copied && (
        <div
          role="status"
          className="pointer-events-none fixed inset-x-0 bottom-[calc(1.5rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-4 print:hidden"
        >
          <span className="rounded-full bg-ios-label px-4 py-2 text-[13px] font-semibold text-ios-bg shadow-lg">
            {t.linkCopied}
          </span>
        </div>
      )}
    </div>
  );
};

export default CalendarBuilder;
