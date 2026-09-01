import { useEffect, useMemo, useState } from 'react';
import { ArrowCounterclockwise, ChevronLeft, ChevronRight, XMark } from './icons';
import {
  columnForMonth,
  dateAt,
  daysInMonth,
  isBeforeToday,
  MONTHS_WITH_31_DAYS,
  monthColumnsFor,
  rowForDate,
  weekdayAt,
} from '../lib/calendar';
import { formatDate, formatList } from '../lib/format';
import { LANGUAGES, LOCALES, translations, type Language } from '../lib/i18n';
import { readViewState, storeLanguage, syncUrl } from '../lib/urlState';

/**
 * The selection, as the two axes the reader actually picks.
 *
 * The grid is month-column x date-row = weekday, and any two of the three fix
 * the third. So the whole interaction is one month and one date, each
 * independently optional:
 *
 *   month alone  -> a column lights up; the readout names the month's 1st
 *   date alone   -> a row lights up; the weekday is not yet determined
 *   both         -> one real date, and the crosshair meets at its weekday
 *
 * Clicking a weekday cell is not a third kind of state — it is shorthand for
 * setting both at once, which is why there is no (row, col) pair here.
 */
interface Selection {
  month: number | null;
  date: number | null;
}

const EMPTY: Selection = { month: null, date: null };

// Every cell is a fixed-height row box holding a square disc. The split matters:
//
//   CELL fixes the row height, which is what keeps the 5-column date block and
//   the 7-column weekday block on the same baseline — their column widths differ
//   by a hair because they divide their gaps differently, so anything that let
//   height follow width would drift the two blocks apart down the grid.
//
//   DISC takes its width from the column and its height from `aspect-square`, so
//   the filled shape is a true circle at every viewport rather than the oval a
//   `rounded-full` box wider or taller than itself produces. Column width is
//   always the smaller of the two dimensions here (max ~32px against a 36px row),
//   so the disc can never outgrow its row.
//
// Splitting them also keeps the tap target at the full row height while the
// visible circle stays honest — on a phone the target is 32px tall where the
// circle is only ~23px across.
//
// The mobile values are the binding constraint, not the desktop ones: at 320px
// each of the seven weekday columns gets ~21px, which 10px tracking-tight text
// fits and 11px does not. Everything scales up from there.
const CELL = 'flex h-8 w-full items-center justify-center sm:h-9';
const DISC = 'flex aspect-square w-full items-center justify-center rounded-full transition-colors';
const DATE_TEXT = 'text-[11px] sm:text-[13px]';
const LABEL_TEXT = 'text-[10px] tracking-tight sm:text-[12px] sm:tracking-normal';

// iOS control surface: dims on press rather than flashing a highlight.
const PRESSABLE = 'select-none transition active:opacity-55';
const FOCUS_RING =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ios-blue';
const CELL_FOCUS =
  'group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-ios-blue';

// The jump range offered by the year picker. The steppers clamp to the same
// bounds, so `year` can never sit outside the option list and leave the select
// rendering blank.
const THIS_YEAR = new Date().getFullYear();
const MIN_YEAR = THIS_YEAR - 60;
const MAX_YEAR = THIS_YEAR + 60;
const YEAR_BOUNDS = { min: MIN_YEAR, max: MAX_YEAR };
const YEARS = Array.from({ length: MAX_YEAR - MIN_YEAR + 1 }, (_, i) => MIN_YEAR + i);

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
  const [language, setLanguage] = useState<Language>(initial.language);
  const [pinned, setPinned] = useState<Selection>({ month: initial.month, date: initial.date });
  const [hovered, setHovered] = useState<Selection>(EMPTY);

  const t = translations[language];

  useEffect(() => {
    syncUrl({ year, language, month: pinned.month, date: pinned.date }, currentYear);
  }, [year, language, pinned, currentYear]);

  useEffect(() => {
    storeLanguage(language);
  }, [language]);

  const monthColumns = useMemo(() => monthColumnsFor(year), [year]);
  const monthRowCount = Math.max(...monthColumns.map(col => col.length));

  // Each axis resolves independently, and a pin beats a hover on its own axis.
  // That is what makes "pin the month, then sweep the dates" work: the pinned
  // column stays lit while the hovered row moves.
  const activeMonth = pinned.month ?? hovered.month;
  const activeCol = activeMonth === null ? null : columnForMonth(year, activeMonth);
  const hasPin = pinned.month !== null || pinned.date !== null;

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
  const activeRow = activeDate === null ? null : rowForDate(activeDate);

  const showToday = year === currentYear;
  const todayCol = columnForMonth(year, currentMonth);
  const todayRow = rowForDate(currentDate);
  const languageIndex = LANGUAGES.findIndex(l => l.id === language);

  const toggleMonth = (month: number) =>
    setPinned(p => {
      if (p.month === month) return { ...p, month: null };
      // Pinning a month also drops a pinned date that month cannot have, so the
      // pinned state stays self-consistent rather than holding an impossible
      // pair that only looks resolved once the month is cleared again.
      const limit = daysInMonth(year, month);
      return { month, date: p.date !== null && p.date > limit ? null : p.date };
    });
  const toggleDate = (date: number) =>
    setPinned(p => ({ ...p, date: p.date === date ? null : date }));

  // A weekday cell sets both axes at once. The month is the column's — preferring
  // today's month when it happens to sit there, since that is the reading most
  // likely wanted — and the date is the row's first, which is at most 7 and so
  // valid in every month.
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
  });
  const toggleCell = (row: number, col: number) =>
    setPinned(p => {
      const next = selectionForCell(row, col);
      const alreadyHere = p.month !== null && columnForMonth(year, p.month) === col && p.date !== null && rowForDate(p.date) === row;
      return alreadyHere ? EMPTY : next;
    });

  const clear = () => {
    setPinned(EMPTY);
    setHovered(EMPTY);
  };

  // Mouse only. Touch browsers synthesize a hover that persists after the tap,
  // which would outlive an unpin and leave the crosshair lit with nothing
  // selected.
  const hoverIfMouse = (e: { pointerType: string }, selection: Selection) => {
    if (e.pointerType === 'mouse') setHovered(s => ({ ...s, ...selection }));
  };


  // The heading is the lookup. With both axes chosen it is a single real date —
  // which is the whole reason the month block became selectable.
  let headline: string;
  if (activeMonth !== null && activeDate !== null) {
    headline = formatDate(LOCALES[language], 'fullDate', new Date(year, activeMonth, activeDate));
  } else if (activeMonth !== null) {
    // A column *means* "months that start on this weekday", so the month's 1st
    // is the fact the column is actually asserting.
    headline = formatDate(LOCALES[language], 'fullDate', new Date(year, activeMonth, 1));
  } else if (activeDate !== null) {
    // A row alone cannot name a weekday — that is the missing half, so say so.
    headline = t.pickMonth;
  } else if (showToday) {
    headline = formatDate(LOCALES[language], 'fullDate', today);
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
          .map(m => formatDate(LOCALES[language], 'dayMonth', new Date(year, m, activeDate)))
      : [];

  return (
    <div className="min-h-dvh bg-ios-bg font-ios text-ios-label antialiased">
      {/* Padding is tight on phones and opens up from `sm`, because the mobile
          width is what the grid has to fit into. The safe-area insets keep the
          title clear of a notch and the footer clear of the home indicator when
          this is saved to the Home Screen. */}
      <div className="mx-auto w-full max-w-lg px-3 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(1.5rem+env(safe-area-inset-top))] sm:px-5">
        {/* aria-live announces the resolved date as focus moves through the
            grid, which is what turns the crosshair into something a screen
            reader can follow. min-h reserves two lines so stepping between
            cells does not shunt the page up and down under the reader's thumb. */}
        <h1
          aria-live="polite"
          className="min-h-[2.5em] text-[18px] font-bold leading-tight tracking-[-0.015em] tabular-nums sm:text-[26px]"
        >
          {headline}
        </h1>

        <div className="mt-3 flex items-center justify-between gap-2">
          {/* Year stepper, shaped like an iOS stepper: one filled pill track
              carrying two round glyph buttons with the value between them. The
              value is itself a <select> — a native picker is the fast path off
              the current year, and on iOS it opens the system wheel, so a jump
              of forty years is one gesture instead of forty taps. */}
          <div className="flex shrink-0 items-center rounded-full bg-ios-fill p-1 text-[17px]">
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
              {YEARS.map(y => (
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
          <div className="flex min-w-0 items-center gap-2">
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
          </div>
        </div>

        {/* Language, as an iOS segmented control. Built on real radio inputs
            rather than ARIA: a native radio group already carries grouped
            semantics and arrow-key navigation, which a set of aria-pressed
            buttons would have to reimplement — and usually reimplements wrong. */}
        <fieldset className="relative mt-3 flex rounded-full bg-ios-fill p-1">
          <legend className="sr-only">{t.languageLabel}</legend>
          <div
            aria-hidden="true"
            className="absolute inset-y-1 left-1 rounded-full bg-ios-thumb shadow-sm transition-transform duration-300 ease-out motion-reduce:transition-none"
            style={{
              width: `calc((100% - 0.5rem) / ${LANGUAGES.length})`,
              transform: `translateX(${languageIndex * 100}%)`,
            }}
          />
          {LANGUAGES.map(({ id, short }) => (
            <label
              key={id}
              className={`${PRESSABLE} relative z-10 flex-1 cursor-pointer rounded-full py-1.5 text-center text-[13px] font-semibold has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ios-blue ${
                language === id ? 'text-ios-label' : 'text-ios-label-2'
              }`}
            >
              <input
                type="radio"
                name="language"
                value={id}
                checked={language === id}
                onChange={() => setLanguage(id)}
                className="sr-only"
              />
              {short}
            </label>
          ))}
        </fieldset>

        {/* Grouped-content card */}
        <div
          className="mt-4 rounded-[1.75rem] bg-ios-card p-2 sm:p-4"
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
              <div className="mb-px grid grid-cols-5 gap-0.5 sm:mb-1 sm:gap-1">
                {Array.from({ length: (monthRowCount - 1) * 5 }, (_, i) => (
                  <div key={`pad-${i}`} className={CELL} />
                ))}
                <div
                  className={`${CELL} col-span-5 text-[9px] font-semibold uppercase tracking-[0.06em] text-ios-label-3 sm:text-[11px]`}
                >
                  {t.dates}
                </div>
              </div>

              <div className="grid grid-cols-5 gap-0.5 sm:gap-1">
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

                    return (
                      <button
                        key={`d-${row}-${col}`}
                        type="button"
                        disabled={outOfRange}
                        aria-pressed={isSelected}
                        onPointerEnter={e => hoverIfMouse(e, { month: null, date: num })}
                        onFocus={() => setHovered(s => ({ ...s, date: num }))}
                        onBlur={() => setHovered(s => ({ ...s, date: null }))}
                        onClick={() => toggleDate(num)}
                        className={`${CELL} group select-none focus:outline-none`}
                      >
                        <span
                          aria-current={isToday ? 'date' : undefined}
                          className={`${DISC} ${DATE_TEXT} ${CELL_FOCUS} font-medium tabular-nums ${
                            outOfRange
                              ? 'text-ios-label-3 line-through decoration-1 opacity-40'
                              : isSelected
                                ? 'bg-ios-blue font-semibold text-white'
                                : isToday
                                  ? 'bg-ios-blue font-semibold text-white'
                                  : inActiveRow
                                    ? 'bg-ios-blue-mid text-ios-blue'
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
              <div className="mb-px grid grid-cols-7 gap-0.5 sm:mb-1 sm:gap-1">
                {Array.from({ length: monthRowCount }, (_, row) =>
                  Array.from({ length: 7 }, (_, col) => {
                    const monthIndex = monthColumns[col][row];
                    if (monthIndex === undefined) return <div key={`m-${row}-${col}`} />;

                    const isSelected = activeMonth === monthIndex;
                    const isCurrent = showToday && monthIndex === currentMonth;
                    const inActiveCol = activeCol === col;

                    return (
                      <button
                        key={`m-${row}-${col}`}
                        type="button"
                        aria-pressed={isSelected}
                        // Intl rather than a fifth translation table: the grid
                        // labels are abbreviations chosen to fit 12 columns, and
                        // an accessible name should be the real month name.
                        aria-label={formatDate(LOCALES[language], 'monthYear', new Date(year, monthIndex, 1))}
                        onPointerEnter={e => hoverIfMouse(e, { month: monthIndex, date: null })}
                        onFocus={() => setHovered(s => ({ ...s, month: monthIndex }))}
                        onBlur={() => setHovered(s => ({ ...s, month: null }))}
                        onClick={() => toggleMonth(monthIndex)}
                        className={`${CELL} group select-none focus:outline-none`}
                      >
                        <span
                          className={`${DISC} ${LABEL_TEXT} ${CELL_FOCUS} overflow-hidden px-px font-semibold ${
                            isSelected || isCurrent
                              ? 'bg-ios-blue text-white'
                              : inActiveCol
                                ? 'bg-ios-blue-mid text-ios-blue'
                                : 'bg-ios-blue-soft text-ios-blue'
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

              <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
                {Array.from({ length: 7 }, (_, row) =>
                  Array.from({ length: 7 }, (_, col) => {
                    const weekdayIndex = weekdayAt(row, col);
                    const onCross = activeRow === row || activeCol === col;
                    const atIntersection = activeRow === row && activeCol === col;
                    const noSelection = activeRow === null && activeCol === null;
                    const isTodayCell =
                      noSelection && showToday && row === todayRow && col === todayCol;

                    return (
                      <button
                        key={`w-${row}-${col}`}
                        type="button"
                        aria-pressed={atIntersection}
                        // Name is the weekday alone. The pressed state travels on
                        // aria-pressed, which assistive tech announces in the
                        // user's own locale — spelling it out here would both
                        // duplicate that and hardcode English into a localized name.
                        aria-label={t.weekdaysLong[weekdayIndex]}
                        onPointerEnter={e => hoverIfMouse(e, selectionForCell(row, col))}
                        onFocus={() => setHovered(selectionForCell(row, col))}
                        onBlur={() => setHovered(EMPTY)}
                        onClick={() => toggleCell(row, col)}
                        // The button keeps the full row height as its tap
                        // target; the disc inside is what gets painted. Focus
                        // and hover are therefore forwarded to the disc, so the
                        // ring traces the circle rather than the taller box.
                        className={`${CELL} group select-none focus:outline-none`}
                      >
                        <span
                          className={`${DISC} ${LABEL_TEXT} ${CELL_FOCUS} font-medium ${
                            atIntersection || isTodayCell
                              ? 'bg-ios-blue font-semibold text-white'
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
                  }),
                )}
              </div>
            </div>
          </div>
        </div>

        {alsoDates.length > 0 && (
          <p className="mt-2 px-1 text-[12px] leading-relaxed text-ios-label-2 sm:text-[13px]">
            <span className="font-semibold text-ios-label-3">{t.alsoLabel}</span>{' '}
            {formatList(LOCALES[language], alsoDates)}
          </p>
        )}

        {/* iOS grouped-list footnote */}
        <p className="mt-3 px-1 text-[12px] leading-relaxed text-ios-label-2 sm:mt-4 sm:text-[13px]">
          {t.hint} <span className="text-ios-label-3">{t.hintTouch}</span>
        </p>
      </div>
    </div>
  );
};

export default CalendarBuilder;
