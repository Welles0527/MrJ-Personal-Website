(() => {
  'use strict';
  // State Council holiday breaks, including adjoining days off, excluding make-up workdays.
  // 2024: https://app.www.gov.cn/govdata/gov/202310/25/508678/article.html
  // 2025: https://www.gov.cn/zhengce/content/202411/content_6986382.htm
  // 2026: https://www.beijing.gov.cn/cs/gncs/zcwj/202603/t20260327_4568275.html
  // 2027: https://www3.xinhuanet.com/politics/20261105/f90cd6ad4df94ab4833b141e52ccfc13/c.html
  const schedules = {
    2024: [
      ['2023-12-30','2024-01-01','元旦'], ['2024-02-10','2024-02-17','春节'],
      ['2024-04-04','2024-04-06','清明节'], ['2024-05-01','2024-05-05','劳动节'],
      ['2024-06-08','2024-06-10','端午节'], ['2024-09-15','2024-09-17','中秋节'], ['2024-10-01','2024-10-07','国庆节']
    ],
    2025: [
      ['2025-01-01','2025-01-01','元旦'], ['2025-01-28','2025-02-04','春节'],
      ['2025-04-04','2025-04-06','清明节'], ['2025-05-01','2025-05-05','劳动节'],
      ['2025-05-31','2025-06-02','端午节'], ['2025-10-01','2025-10-08','国庆节、中秋节']
    ],
    2026: [
      ['2026-01-01','2026-01-03','元旦'], ['2026-02-15','2026-02-23','春节'],
      ['2026-04-04','2026-04-06','清明节'], ['2026-05-01','2026-05-05','劳动节'],
      ['2026-06-19','2026-06-21','端午节'], ['2026-09-25','2026-09-27','中秋节'], ['2026-10-01','2026-10-07','国庆节']
    ],
    2027: [
      ['2027-01-01','2027-01-03','元旦'], ['2027-02-05','2027-02-13','春节'],
      ['2027-04-03','2027-04-05','清明节'], ['2027-05-01','2027-05-05','劳动节'],
      ['2027-06-09','2027-06-09','端午节'], ['2027-09-15','2027-09-15','中秋节'], ['2027-10-01','2027-10-07','国庆节']
    ]
  };
  const periods = Object.values(schedules).flat();
  const get = date => periods.find(([start,end]) => date >= start && date <= end);
  function decorate() {
    if (!['home','travel'].includes(state.page)) return;
    document.querySelectorAll('.summary-day[data-date],.big-day[data-date],.mini-day[data-date]').forEach(cell => {
      const date = cell.dataset.date, holiday = get(date);
      if (!holiday) return;
      const day = new Date(date+'T12:00:00Z'), weekday = day.getUTCDay(), month = date.slice(0,7);
      const adjacent = offset => {
        const next = new Date(day); next.setUTCDate(next.getUTCDate()+offset);
        const key = next.toISOString().slice(0,10);
        return key.slice(0,7) === month && get(key) === holiday;
      };
      cell.classList.add('calendar-holiday');
      cell.classList.toggle('holiday-prev', weekday !== 1 && adjacent(-1));
      cell.classList.toggle('holiday-next', weekday !== 0 && adjacent(1));
      cell.dataset.holiday = holiday[2];
      const label = date+' · '+holiday[2]+'假期';
      if (!cell.querySelector('.calendar-holiday-label')) {
        const marker = document.createElement('span');
        marker.className = 'calendar-holiday-label';
        marker.title = label;
        marker.setAttribute('aria-label',label);
        if (cell.classList.contains('mini-day')) {
          marker.innerHTML = icon('flag');
          (cell.querySelector('.summary-day-icons') || cell).append(marker);
        } else {
          marker.textContent = holiday[2];
          (cell.querySelector('.summary-date,.day-number') || cell).after(marker);
        }
        cell.title = [cell.title, label].filter(Boolean).join('；');
        cell.setAttribute('aria-label',[cell.getAttribute('aria-label'),label].filter(Boolean).join('；'));
      }
    });
    if (!schedules[state.year] && !document.querySelector('.holiday-coverage')) {
      const note = document.createElement('p'); note.className = 'holiday-coverage muted';
      note.textContent = state.year+'年官方假期安排尚未收录';
      document.querySelector('.month-strip')?.after(note);
    }
  }
  const style = document.createElement('style');
  style.textContent = `
body:is(.summary-page,.travel-page) .mini-grid{--holiday-gap:3px}
body.summary-page .summary-grid,body.travel-page .big-grid{--holiday-gap:7px}
body:is(.summary-page,.travel-page) .calendar-holiday{position:relative;background:#c3e9ca!important;color:#234d32!important;border-color:#c3e9ca!important}
body:is(.summary-page,.travel-page) .calendar-holiday.holiday-prev{border-top-left-radius:0!important;border-bottom-left-radius:0!important}
body:is(.summary-page,.travel-page) .calendar-holiday.holiday-next{border-top-right-radius:0!important;border-bottom-right-radius:0!important}
body:is(.summary-page,.travel-page) .calendar-holiday.holiday-next::after{content:"";position:absolute;left:100%;top:0;bottom:0;width:calc(var(--holiday-gap) + 2px);background:#c3e9ca;pointer-events:none}
body:is(.summary-page,.travel-page) :is(.summary-day,.big-day).calendar-holiday{border-width:1px}
body:is(.summary-page,.travel-page) :is(.summary-day,.big-day).calendar-holiday.holiday-next::after{top:-1px;bottom:-1px}
body:is(.summary-page,.travel-page) .calendar-holiday.today{box-shadow:inset 0 0 0 2px var(--purple)}
body:is(.summary-page,.travel-page) .calendar-holiday .day-number{color:#234d32}
.calendar-holiday-label{display:block;color:#234d32;font-size:11px;line-height:1.4;margin:0 0 5px;overflow-wrap:anywhere}
.mini-day .calendar-holiday-label{display:inline-flex;margin:0;align-items:center;justify-content:center}
.calendar-holiday-label svg{width:12px;height:12px}
.holiday-coverage{font-size:12px}
@media(max-width:760px){body.summary-page .summary-grid,body.travel-page .big-grid{--holiday-gap:3px}.travel-month .calendar-holiday-label{font-size:9px}}
`;
  document.head.append(style);
  window.CalendarHolidays = { get, decorate };
})();
