import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';

type Language = 'en' | 'zh' | 'ms' | 'vi';

interface Translation {
  title: string;
  months: string[];
  weekdays: string[];
  currentYear: string;
  language: string;
}

interface Translations {
  [key: string]: Translation;
}

interface HoverCoords {
  row: number | null;
  col: number | null;
}

const CalendarBuilder = () => {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const currentDate = today.getDate();
  const currentDay = today.getDay();
  
  const [year, setYear] = useState(currentYear);
  const [hoverCoords, setHoverCoords] = useState<HoverCoords>({ row: null, col: null });
  const [language, setLanguage] = useState<Language>('en');

  const translations: Translations = {
    en: {
      title: 'One Page Calendar',
      months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      currentYear: 'Current Year',
      language: 'Language'
    },
    zh: {
      title: '单页日历',
      months: ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'],
      weekdays: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'],
      currentYear: '当前年份',
      language: '语言'
    },
    ms: {
      title: 'Kalendar Satu Halaman',
      months: ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogo', 'Sep', 'Okt', 'Nov', 'Dis'],
      weekdays: ['Ahd', 'Isn', 'Sel', 'Rab', 'Kha', 'Jum', 'Sab'],
      currentYear: 'Tahun Semasa',
      language: 'Bahasa'
    },
    vi: {
      title: 'Lịch Một Trang',
      months: ['Th1', 'Th2', 'Th3', 'Th4', 'Th5', 'Th6', 'Th7', 'Th8', 'Th9', 'Th10', 'Th11', 'Th12'],
      weekdays: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'],
      currentYear: 'Năm Hiện Tại',
      language: 'Ngôn Ngữ'
    }
  };
  
  const getFirstDayOfMonth = (year: number, monthIndex: number): number => {
    return new Date(year, monthIndex, 1).getDay();
  };

  const getMonthPositions = (year: number): string[][] => {
    const positions = Array(12).fill(0).map((_, i) => {
      const firstDay = getFirstDayOfMonth(year, i);
      return firstDay;
    });
    let columns: string[][] = Array(7).fill(null).map(() => []);
    positions.forEach((pos, idx) => {
      columns[pos].push(translations[language].months[idx]);
    });
    return columns;
  };

  const getCurrentMonthColumn = (year: number, month: number): number => {
    return getFirstDayOfMonth(year, month);
  };

  const generateWeekdayGrid = (): string[][] => {
    const weekdays = translations[language].weekdays;
    const grid = [weekdays];
    for (let i = 1; i < 7; i++) {
      grid.push([...weekdays.slice(i), ...weekdays.slice(0, i)]);
    }
    return grid;
  };

  const isHighlighted = (section: string, rowIdx: number, colIdx: number): boolean => {
    if (section !== 'weekdays') return false;
    
    if (hoverCoords.row !== null || hoverCoords.col !== null) {
      return rowIdx === hoverCoords.row || colIdx === hoverCoords.col;
    }

    if (year === currentYear) {
      const currentMonthColumn = getCurrentMonthColumn(year, currentMonth);
      const currentDateRow = Math.floor((currentDate - 1) % 7);
      
      return colIdx === currentMonthColumn && rowIdx === currentDateRow;
    }

    return false;
  };

  const isPastDate = (num: number): boolean => {
    return year === currentYear && currentMonth === new Date().getMonth() && num < currentDate;
  };

  const isToday = (num: number): boolean => {
    return year === currentYear && num === currentDate && currentMonth === new Date().getMonth();
  };

  const hasThirtyOneDays = (monthName: string): boolean => {
    const monthsWith31Days = ['Jan', 'Mar', 'May', 'Jul', 'Aug', 'Oct', 'Dec'];
    const monthsWith31DaysZh = ['一月', '三月', '五月', '七月', '八月', '十月', '十二月'];
    const monthsWith31DaysMs = ['Jan', 'Mac', 'Mei', 'Jul', 'Ogo', 'Okt', 'Dis'];
    const monthsWith31DaysVi = ['Th1', 'Th3', 'Th5', 'Th7', 'Th8', 'Th10', 'Th12'];
    
    return monthsWith31Days.includes(monthName) ||
           monthsWith31DaysZh.includes(monthName) ||
           monthsWith31DaysMs.includes(monthName) ||
           monthsWith31DaysVi.includes(monthName);
  };

  return (
    <div className="bg-white max-w-2xl py-20 m-auto transform origin-top-left 
                    [overflow-x:visible] min-[320px]:[transform:rotate(90deg)_translate(0,-100%)]
                    min-[768px]:[transform:none]">
      {/* Header Section */}
      <div className="px-8 mb-4">
        {/* Header Section */}
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-semibold text-gray-800">
            {translations[language].title}
          </h1>
        {/* Year Controls */}
        <div className="flex items-center">
          <button 
            onClick={() => setYear(year - 1)}
            className="p-2 rounded-full text-blue-500 hover:bg-blue-50 transition-colors"
            aria-label="Previous Year"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className={`text-2xl font-medium ${year === currentYear ? 'text-blue-600' : 'text-gray-800'}`}>
            {year}
          </span>
          <button 
            onClick={() => setYear(year + 1)}
            className="p-2 rounded-full text-blue-500 hover:bg-blue-50 transition-colors"
            aria-label="Next Year"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            onClick={() => setYear(currentYear)}
            className="ml-1 px-3 py-1 rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-100 transition-colors flex items-center gap-1 text-sm"
            aria-label="Reset to Current Year"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{translations[language].currentYear}</span>
          </button>
        </div>
          <select 
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            className="px-2 py-1 text-sm rounded-lg bg-gray-50 text-gray-800 border-gray-200 focus:outline-none"
          >
            <option value="en">English</option>
            <option value="zh">中文</option>
            <option value="ms">Melayu</option>
            <option value="vi">Tiếng Việt</option>
          </select>
        </div>


      </div>

      {/* Calendar Table */}
      <div className="px-4">
        {/* Main Calendar Grid */}
        <div className="mt-4">
          <table className="w-full border-separate border-spacing-[2px]">
            <tbody>
              {/* Month Row */}
              {Array.from({ length: Math.max(...getMonthPositions(year).map(col => col.length)) }, (_, rowIdx) => (
                <tr key={`month-${rowIdx}`}>
                  {/* Left side empty cells to align with date grid */}
                  {[1,2,3,4,5].map((colIdx) => (
                    <td key={`empty-left-${colIdx}`} />
                  ))}
                  {/* Month cells */}
                  {getMonthPositions(year).map((column, colIdx) => (
                    <td key={`month-${colIdx}`} className="p-[1px]">
                      {column[rowIdx] && (
                        <div 
                          className={`h-8 flex items-center justify-center text-xs font-medium rounded-md
                                    ${year === currentYear && translations[language].months.indexOf(column[rowIdx]) === currentMonth
                                      ? 'bg-blue-500 text-white' 
                                      : 'bg-blue-50 text-blue-600'}
                                    ${hasThirtyOneDays(column[rowIdx]) ? 'underline decoration-2 underline-offset-4' : ''}`}
                        >
                          {column[rowIdx]}
                        </div>
                      )}
                    </td>
                  ))}
                </tr>
              ))}

              {/* Dates and Weekdays Rows */}
              {Array.from({ length: 7 }, (_, rowIdx) => (
                <tr key={`row-${rowIdx}`}>
                  {/* Date cells */}
                  {[1,2,3,4,5].map((colIdx) => {
                    const num = rowIdx + 1 + (colIdx - 1) * 7;
                    if (num > 31) return <td key={`date-${colIdx}`} className="p-0" />;
                    return (
                      <td key={`date-${colIdx}`} className="p-[1px]">
                        <div 
                          className={`h-8 flex items-center justify-center rounded-md text-xs font-medium
                                 transition-colors duration-150 cursor-pointer
                                 ${isToday(num) 
                                   ? 'bg-blue-500 text-white' 
                                   : isPastDate(num)
                                     ? 'text-gray-400'
                                     : 'text-gray-600 hover:bg-gray-10'}
                                 ${num === 31 ? 'underline decoration-2 underline-offset-4' : ''}`}
                        >
                          {num}
                        </div>
                      </td>
                    );
                  })}

                  {/* Weekday cells */}
                  {generateWeekdayGrid()[rowIdx].map((day, colIdx) => (
                    <td key={`weekday-${colIdx}`} className="p-[1px]">
                      <div 
                        onMouseEnter={() => setHoverCoords({ row: rowIdx, col: colIdx })}
                        onMouseLeave={() => setHoverCoords({ row: null, col: null })}
                        className={`h-8 flex items-center justify-center rounded-md text-xs font-medium
                               transition-colors duration-150 cursor-pointer
                               ${isHighlighted('weekdays', rowIdx, colIdx)
                                 ? 'bg-blue-500 text-white' 
                                 : 'hover:bg-gray-10'}
                               ${(day.includes('Sun') || day.includes('周日') || day.includes('Ahd') || day === 'CN')
                                 ? 'text-red-500'
                                 : 'text-gray-600'}`}
                      >
                        {day}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CalendarBuilder;