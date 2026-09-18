export type Language = 'en' | 'zh' | 'ms' | 'vi';

export interface Translation {
  title: string;
  months: string[];
  weekdays: string[];
  weekdaysLong: string[];
  currentYear: string;
  prevYear: string;
  nextYear: string;
  languageLabel: string;
  yearLabel: string;
  dates: string;
  hint: string;
  hintTouch: string;
  clear: string;
  pickMonth: string;
  alsoLabel: string;
  weekdayLabel: string;
  todayLabel: string;
  presetsLabel: string;
  /** Header action that copies or shares the current view's link. */
  share: string;
  /** Transient confirmation after a copy, where no share sheet was available. */
  linkCopied: string;
  /** Leads the list of years whose grid is identical to this one. */
  sameGridAs: string;
  /** Accessible name for the calendar-type badge. */
  calendarTypeLabel: string;
  /** `{d}` is the weekday the year starts on. */
  commonYearStarting: string;
  leapYearStarting: string;
  prevSameGrid: string;
  nextSameGrid: string;
  /** The type-jump control's accessible group name. */
  yearTypeNav: string;
  /** Direct date entry. */
  goToDate: string;
  print: string;
  /** The collapsible explainer, for a reader meeting this layout cold. */
  howToRead: string;
  stepMonth: string;
  stepDate: string;
  stepCross: string;
  worked: string;
  /** What the underline under a month (and under 31) means. */
  markerNote: string;
  /** The fourteen-type browser, and the gesture that drives the year. */
  allTypes: string;
  allTypesNote: string;
  commonYears: string;
  leapYears: string;
  swipeHint: string;
  /** Leads the tappable examples inside the explainer. */
  tryIt: string;
  /** Accessible names for the three blocks, once they carry grid semantics. */
  monthsLabel: string;
  weekdayGridLabel: string;
  dateGridLabel: string;
}

/** Segment labels: four have to fit 320px, and the endonym is what a reader
    scanning for their own language looks for. */
export const LANGUAGES: { id: Language; short: string }[] = [
  { id: 'en', short: 'EN' },
  { id: 'zh', short: '中文' },
  { id: 'ms', short: 'BM' },
  { id: 'vi', short: 'VI' },
];

/** BCP 47 tags for Intl. Full dates, month names and field order come from
    Intl rather than the tables below, which hold only the abbreviations the
    12-column grid needs. */
export const LOCALES: Record<Language, string> = {
  en: 'en-GB',
  zh: 'zh-CN',
  ms: 'ms-MY',
  vi: 'vi-VN',
};

export const isLanguage = (value: unknown): value is Language =>
  typeof value === 'string' && LANGUAGES.some(l => l.id === value);

/**
 * Fills the one placeholder these tables use.
 *
 * Kept to a single `{d}` rather than a general template engine: the only
 * variable phrase in the UI is "<common|leap> year starting <weekday>", and the
 * languages here put the weekday in different positions, which a concatenation
 * could not express but a placeholder can.
 */
export const fill = (template: string, value: string): string =>
  template.replace('{d}', value);

export const translations: Record<Language, Translation> = {
  en: {
    title: 'One Page Calendar',
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    weekdaysLong: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    currentYear: 'Current Year',
    prevYear: 'Previous year',
    nextYear: 'Next year',
    languageLabel: 'Language',
    yearLabel: 'Jump to year',
    dates: 'Dates',
    hint: 'Pick a month and a date — the weekday where they cross is your answer.',
    hintTouch: 'Tap any month, date or weekday.',
    clear: 'Clear',
    pickMonth: 'Now pick a month',
    alsoLabel: 'Same weekday:',
    weekdayLabel: 'Weekday',
    todayLabel: 'Today',
    presetsLabel: 'Shortcuts',
    share: 'Share this view',
    linkCopied: 'Link copied',
    sameGridAs: 'Same grid as',
    calendarTypeLabel: 'Calendar type',
    commonYearStarting: 'Common year starting {d}',
    leapYearStarting: 'Leap year starting {d}',
    prevSameGrid: 'Previous year with this grid',
    nextSameGrid: 'Next year with this grid',
    yearTypeNav: 'Years sharing this grid',
    goToDate: 'Go to date',
    print: 'Print',
    howToRead: 'How to read it',
    stepMonth: 'Find the month — note its column.',
    stepDate: 'Find the date — note its row.',
    stepCross: 'The weekday where they cross is the answer.',
    worked: 'For example',
    markerNote: 'An underline marks a month with 31 days — and the 31st itself.',
    allTypes: 'All fourteen',
    allTypesNote: 'Every year that has ever been, or will be, is one of these.',
    commonYears: 'Common years',
    leapYears: 'Leap years',
    swipeHint: 'Drag the grid sideways to change the year.',
    tryIt: 'Try',
    monthsLabel: 'Months',
    weekdayGridLabel: 'Weekdays',
    dateGridLabel: 'Dates',
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
    yearLabel: '跳转到年份',
    dates: '日期',
    hint: '选择月份和日期 — 两者交叉处就是星期。',
    hintTouch: '点击任意月份、日期或星期。',
    clear: '清除',
    pickMonth: '请再选择月份',
    alsoLabel: '同一星期：',
    weekdayLabel: '星期',
    todayLabel: '今天',
    presetsLabel: '快捷方式',
    share: '分享当前视图',
    linkCopied: '链接已复制',
    sameGridAs: '同版面年份',
    calendarTypeLabel: '日历类型',
    commonYearStarting: '平年，{d}开始',
    leapYearStarting: '闰年，{d}开始',
    prevSameGrid: '上一个同版面年份',
    nextSameGrid: '下一个同版面年份',
    yearTypeNav: '同版面的年份',
    goToDate: '跳转到日期',
    print: '打印',
    howToRead: '怎么看这张表',
    stepMonth: '找到月份 — 记住它所在的列。',
    stepDate: '找到日期 — 记住它所在的行。',
    stepCross: '行列交叉处的星期就是答案。',
    worked: '例如',
    markerNote: '下划线表示这个月有 31 天 — 日期栏的 31 同理。',
    allTypes: '全部十四种',
    allTypesNote: '古往今来的每一年，都是这十四种版面之一。',
    commonYears: '平年',
    leapYears: '闰年',
    swipeHint: '左右拖动表格即可切换年份。',
    tryIt: '试试',
    monthsLabel: '月份',
    weekdayGridLabel: '星期',
    dateGridLabel: '日期',
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
    yearLabel: 'Lompat ke tahun',
    dates: 'Tarikh',
    hint: 'Pilih bulan dan tarikh — hari di persilangan itu jawapannya.',
    hintTouch: 'Ketik mana-mana bulan, tarikh atau hari.',
    clear: 'Kosongkan',
    pickMonth: 'Sekarang pilih bulan',
    alsoLabel: 'Hari sama:',
    weekdayLabel: 'Hari',
    todayLabel: 'Hari ini',
    presetsLabel: 'Pintasan',
    share: 'Kongsi paparan ini',
    linkCopied: 'Pautan disalin',
    sameGridAs: 'Sama dengan tahun',
    calendarTypeLabel: 'Jenis kalendar',
    commonYearStarting: 'Tahun biasa bermula {d}',
    leapYearStarting: 'Tahun lompat bermula {d}',
    prevSameGrid: 'Tahun sama sebelumnya',
    nextSameGrid: 'Tahun sama berikutnya',
    yearTypeNav: 'Tahun dengan susunan sama',
    goToDate: 'Pergi ke tarikh',
    print: 'Cetak',
    howToRead: 'Cara membacanya',
    stepMonth: 'Cari bulan — perhatikan lajurnya.',
    stepDate: 'Cari tarikh — perhatikan barisnya.',
    stepCross: 'Hari di tempat keduanya bersilang ialah jawapannya.',
    worked: 'Contohnya',
    markerNote: 'Garis bawah menandakan bulan berhari 31 — dan tarikh 31 itu sendiri.',
    allTypes: 'Kesemua empat belas',
    allTypesNote: 'Setiap tahun yang pernah ada, atau akan ada, ialah salah satu daripadanya.',
    commonYears: 'Tahun biasa',
    leapYears: 'Tahun lompat',
    swipeHint: 'Seret grid ke sisi untuk menukar tahun.',
    tryIt: 'Cuba',
    monthsLabel: 'Bulan',
    weekdayGridLabel: 'Hari',
    dateGridLabel: 'Tarikh',
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
    yearLabel: 'Chuyển đến năm',
    dates: 'Ngày',
    hint: 'Chọn tháng và ngày — thứ ở chỗ giao nhau là đáp án.',
    hintTouch: 'Nhấn vào tháng, ngày hoặc thứ bất kỳ.',
    clear: 'Xóa',
    pickMonth: 'Hãy chọn tháng',
    alsoLabel: 'Cùng thứ:',
    weekdayLabel: 'Thứ',
    todayLabel: 'Hôm nay',
    presetsLabel: 'Lối tắt',
    share: 'Chia sẻ chế độ xem này',
    linkCopied: 'Đã sao chép liên kết',
    sameGridAs: 'Cùng bố cục với',
    calendarTypeLabel: 'Loại lịch',
    commonYearStarting: 'Năm thường bắt đầu {d}',
    leapYearStarting: 'Năm nhuận bắt đầu {d}',
    prevSameGrid: 'Năm cùng bố cục trước',
    nextSameGrid: 'Năm cùng bố cục sau',
    yearTypeNav: 'Các năm cùng bố cục',
    goToDate: 'Đến ngày',
    print: 'In',
    howToRead: 'Cách đọc bảng này',
    stepMonth: 'Tìm tháng — ghi nhớ cột của nó.',
    stepDate: 'Tìm ngày — ghi nhớ hàng của nó.',
    stepCross: 'Thứ ở chỗ hai bên giao nhau là đáp án.',
    worked: 'Ví dụ',
    markerNote: 'Gạch chân đánh dấu tháng có 31 ngày — và chính ngày 31.',
    allTypes: 'Cả mười bốn',
    allTypesNote: 'Mọi năm đã từng có, hoặc sẽ có, đều là một trong số này.',
    commonYears: 'Năm thường',
    leapYears: 'Năm nhuận',
    swipeHint: 'Kéo ngang bảng để đổi năm.',
    tryIt: 'Thử',
    monthsLabel: 'Tháng',
    weekdayGridLabel: 'Thứ',
    dateGridLabel: 'Ngày',
  },
};
