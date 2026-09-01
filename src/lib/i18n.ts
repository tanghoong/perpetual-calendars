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
  },
};
