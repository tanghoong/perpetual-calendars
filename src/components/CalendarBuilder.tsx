import { useState } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw, X } from 'lucide-react';

type Language = 'en' | 'zh' | 'ms' | 'vi';

interface Translation {
  title: string;
  months: string[];
  weekdays: string[];
  weekdaysLong: string[];
  currentYear: string;
  prevYear: string;
  nextYear: string;
  languageLabel: string;
  dates: string;
  hint: string;
  hintTouch: string;
  clear: string;
}

interface Cell {
  row: number;
  col: number;
}

// Month lengths and the Sunday column are keyed off indices, never off
// translated labels — otherwise every new language needs its own string list.
const MONTHS_WITH_31_DAYS = new Set([0, 2, 4, 6, 7, 9, 11]);

const translations: Record<Language, Translation> = {
  en: {
    title: 'One Page Calendar',
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    weekdaysLong: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    currentYear: 'Current Year',
    prevYear: 'Previous year',
    nextYear: 'Next year',
    languageLabel: 'Language',
    dates: 'Dates',
    hint: 'Find the month, then the date — the weekday where they cross is your answer.',
    hintTouch: 'Tap a weekday to pin the crosshair.',
    clear: 'Clear',
  },
  zh: {
    title: '单页日历',
    // Numeric form: 十一月/十二月 are too wide for a 12-column grid on a phone.
    months: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
    weekdays: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'],
    weekdaysLong: ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'],
    currentYear: '当前年份',
    prevYear: '上一年',
    nextYear: '下一年',
    languageLabel: '语言',
    dates: '日期',
    hint: '先找月份，再找日期 — 两者交叉处就是星期。',
    hintTouch: '点击星期可固定十字线。',
    clear: '清除',
  },
  ms: {
    title: 'Kalendar Satu Halaman',
    months: ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogo', 'Sep', 'Okt', 'Nov', 'Dis'],
    weekdays: ['Ahd', 'Isn', 'Sel', 'Rab', 'Kha', 'Jum', 'Sab'],
    weekdaysLong: ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'],
    currentYear: 'Tahun Semasa',
    prevYear: 'Tahun sebelumnya',
    nextYear: 'Tahun berikutnya',
    languageLabel: 'Bahasa',
    dates: 'Tarikh',
    hint: 'Cari bulan, kemudian tarikh — hari di persilangan itu jawapannya.',
    hintTouch: 'Ketik hari untuk menetapkan penunjuk.',
    clear: 'Kosongkan',
  },
  vi: {
    title: 'Lịch Một Trang',
    months: ['Th1', 'Th2', 'Th3', 'Th4', 'Th5', 'Th6', 'Th7', 'Th8', 'Th9', 'Th10', 'Th11', 'Th12'],
    weekdays: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'],
    weekdaysLong: ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'],
    currentYear: 'Năm Hiện Tại',
    prevYear: 'Năm trước',
    nextYear: 'Năm sau',
    languageLabel: 'Ngôn ngữ',
    dates: 'Ngày',
    hint: 'Tìm tháng, rồi tìm ngày — thứ ở chỗ giao nhau là đáp án.',
    hintTouch: 'Nhấn vào thứ để ghim đường dẫn.',
    clear: 'Xóa',
  },
};

// One shared cell metric so the date block and the weekday block always line
// up. Text size is applied per block, since month labels are the longest and
// need to go a step smaller on phones.
const CELL = 'flex items-center justify-center rounded-md h-7 sm:h-8 md:h-9';
const DATE_TEXT = 'text-[11px] sm:text-xs md:text-sm';
const LABEL_TEXT = 'text-[10px] tracking-tight sm:text-xs sm:tracking-normal md:text-sm';

const CalendarBuilder = () => {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const currentDate = today.getDate();

  const [year, setYear] = useState(currentYear);
  const [language, setLanguage] = useState<Language>('en');
  const [hovered, setHovered] = useState<Cell | null>(null);
  const [pinned, setPinned] = useState<Cell | null>(null);

  const t = translations[language];

  const firstWeekdayOf = (y: number, monthIndex: number): number =>
    new Date(y, monthIndex, 1).getDay();

  // Each column holds the months that begin on that weekday. Values are month
  // indices, so labels stay a pure presentation concern.
  const monthColumns: number[][] = Array.from({ length: 7 }, () => []);
  for (let m = 0; m < 12; m++) monthColumns[firstWeekdayOf(year, m)].push(m);
  const monthRowCount = Math.max(...monthColumns.map(col => col.length));

  // A pin beats a hover, so a selection survives stray pointer events. `hovered`
  // is only ever set by a real mouse or by keyboard focus — see the weekday
  // cell's onPointerEnter. If touch were allowed to set it, unpinning would fall
  // back to a retained synthetic hover and the crosshair would stay lit.
  const active = pinned ?? hovered;
  const showToday = year === currentYear;
  const todayCol = firstWeekdayOf(year, currentMonth);
  const todayRow = (currentDate - 1) % 7;

  const togglePin = (cell: Cell) =>
    setPinned(prev => (prev && prev.row === cell.row && prev.col === cell.col ? null : cell));

  return (
    <div className="min-h-screen bg-slate-50 px-2 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-3xl">
        {/* Header — stacks on narrow screens instead of crowding one row */}
        <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-lg font-semibold text-slate-800 sm:text-xl">{t.title}</h1>

          <div className="flex items-center justify-between gap-2 sm:justify-end">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setYear(year - 1)}
                className="rounded-full p-1.5 text-blue-600 transition-colors hover:bg-blue-100"
                aria-label={t.prevYear}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span
                className={`min-w-[4ch] text-center text-xl font-medium tabular-nums sm:text-2xl ${
                  showToday ? 'text-blue-600' : 'text-slate-800'
                }`}
              >
                {year}
              </span>
              <button
                onClick={() => setYear(year + 1)}
                className="rounded-full p-1.5 text-blue-600 transition-colors hover:bg-blue-100"
                aria-label={t.nextYear}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              {!showToday && (
                <button
                  onClick={() => setYear(currentYear)}
                  // The text below is hidden under `sm`, so the button would
                  // otherwise be an icon with no accessible name.
                  aria-label={t.currentYear}
                  className="ml-1 flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-1 text-xs text-blue-600 transition-colors hover:bg-blue-100 sm:text-sm"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{t.currentYear}</span>
                </button>
              )}
            </div>

            <label className="flex items-center">
              <span className="sr-only">{t.languageLabel}</span>
              <select
                value={language}
                onChange={e => setLanguage(e.target.value as Language)}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 sm:text-sm"
              >
                <option value="en">English</option>
                <option value="zh">中文</option>
                <option value="ms">Melayu</option>
                <option value="vi">Tiếng Việt</option>
              </select>
            </label>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-2 shadow-sm ring-1 ring-slate-200 sm:p-5">
          {/* Two blocks side by side, sized 5:7 to match their column counts.
              The gap is what makes the date axis read as separate from the
              weekday axis — in the old single-table layout they looked alike. */}
          <div className="flex gap-1 sm:gap-4">
            {/* Dates */}
            <div className="flex-[5]">
              {/* Mirrors the month grid's shape with the same cell and gap
                  classes, so both blocks start on the same line at every
                  breakpoint without hard-coded offsets. The otherwise dead
                  corner carries the axis label. */}
              <div className="mb-px grid grid-cols-5 gap-0.5 sm:mb-1 sm:gap-1">
                {Array.from({ length: (monthRowCount - 1) * 5 }, (_, i) => (
                  <div key={`pad-${i}`} className={CELL} />
                ))}
                <div
                  className={`${CELL} col-span-5 text-[9px] font-medium uppercase tracking-wide text-slate-400 sm:text-[11px]`}
                >
                  {t.dates}
                </div>
              </div>

              <div className="grid grid-cols-5 gap-px sm:gap-1">
                {Array.from({ length: 7 }, (_, row) =>
                  Array.from({ length: 5 }, (_, col) => {
                    const num = row + 1 + col * 7;
                    if (num > 31) return <div key={`d-${row}-${col}`} />;

                    const isToday = showToday && num === currentDate;
                    const isPast = showToday && num < currentDate;
                    const inActiveRow = active?.row === row;

                    return (
                      <div
                        key={`d-${row}-${col}`}
                        aria-current={isToday ? 'date' : undefined}
                        className={`${CELL} ${DATE_TEXT} font-medium tabular-nums transition-colors ${
                          isToday
                            ? 'bg-blue-600 text-white'
                            : inActiveRow
                              ? 'bg-blue-100 text-blue-700'
                              : isPast
                                ? 'text-slate-300'
                                : 'text-slate-600'
                        } ${num === 31 ? 'underline decoration-2 underline-offset-2' : ''}`}
                      >
                        {num}
                      </div>
                    );
                  }),
                )}
              </div>
            </div>

            {/* Months above, weekdays below — they share the 7 columns */}
            <div className="flex-[7]">
              <div className="mb-px grid grid-cols-7 gap-0.5 sm:mb-1 sm:gap-1">
                {Array.from({ length: monthRowCount }, (_, row) =>
                  Array.from({ length: 7 }, (_, col) => {
                    const monthIndex = monthColumns[col][row];
                    if (monthIndex === undefined) return <div key={`m-${row}-${col}`} />;

                    const isCurrent = showToday && monthIndex === currentMonth;
                    const inActiveCol = active?.col === col;

                    return (
                      <div
                        key={`m-${row}-${col}`}
                        className={`${CELL} ${LABEL_TEXT} overflow-hidden px-px font-medium transition-colors ${
                          isCurrent
                            ? 'bg-blue-600 text-white'
                            : inActiveCol
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-blue-50 text-blue-600'
                        } ${
                          MONTHS_WITH_31_DAYS.has(monthIndex)
                            ? 'underline decoration-2 underline-offset-2'
                            : ''
                        }`}
                      >
                        {t.months[monthIndex]}
                      </div>
                    );
                  }),
                )}
              </div>

              <div className="grid grid-cols-7 gap-px sm:gap-1">
                {Array.from({ length: 7 }, (_, row) =>
                  Array.from({ length: 7 }, (_, col) => {
                    const weekdayIndex = (col + row) % 7;
                    const isPinned = pinned?.row === row && pinned?.col === col;
                    const onCross = active ? active.row === row || active.col === col : false;
                    const atIntersection = active?.row === row && active?.col === col;
                    const isTodayCell = !active && showToday && row === todayRow && col === todayCol;

                    return (
                      <button
                        key={`w-${row}-${col}`}
                        type="button"
                        aria-pressed={isPinned}
                        // Name is the weekday alone. The pinned state travels on
                        // aria-pressed, which assistive tech announces in the
                        // user's own locale — spelling it out here would both
                        // duplicate that and hardcode English into a localized name.
                        aria-label={t.weekdaysLong[weekdayIndex]}
                        // Mouse only. Touch browsers synthesize a hover that
                        // persists after the tap, which would outlive an unpin.
                        onPointerEnter={e => {
                          if (e.pointerType === 'mouse') setHovered({ row, col });
                        }}
                        onPointerLeave={() => setHovered(null)}
                        onFocus={() => setHovered({ row, col })}
                        onBlur={() => setHovered(null)}
                        onClick={() => togglePin({ row, col })}
                        className={`${CELL} ${LABEL_TEXT} w-full font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                          atIntersection || isTodayCell
                            ? 'bg-blue-600 text-white'
                            : onCross
                              ? 'bg-blue-100 text-blue-700'
                              : weekdayIndex === 0
                                ? 'text-red-500 hover:bg-slate-100'
                                : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {t.weekdays[weekdayIndex]}
                      </button>
                    );
                  }),
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-start justify-between gap-3 sm:mt-4">
          <p className="text-[11px] leading-relaxed text-slate-500 sm:text-xs">
            {t.hint} <span className="text-slate-400">{t.hintTouch}</span>
          </p>
          {pinned && (
            <button
              onClick={() => setPinned(null)}
              className="flex shrink-0 items-center gap-1 rounded-lg bg-slate-200 px-2 py-1 text-[11px] text-slate-600 transition-colors hover:bg-slate-300 sm:text-xs"
            >
              <X className="h-3 w-3" />
              {t.clear}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CalendarBuilder;
