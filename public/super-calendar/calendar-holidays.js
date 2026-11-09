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
  const color = 'rgba(217,0,54,0.16)';
  const periods = Object.values(schedules).flat();
  const get = date => periods.find(([start,end]) => date >= start && date <= end);
  function decorate() {
    if (!['home','travel'].includes(state.page)) return;
    document.querySelectorAll('.summary-day[data-date],.big-day[data-date],.mini-day[data-date]').forEach(cell => {
      const date = cell.dataset.date, holiday = get(date);
      if (!holiday) return;
      cell.classList.add('calendar-holiday');
      cell.dataset.holiday = holiday[2];
      const label = date+' · '+holiday[2]+'假期';
      if (!cell.querySelector('.calendar-holiday-label')) {
        const marker = document.createElement('span');
        marker.className = 'calendar-holiday-label';
        marker.title = label;
        marker.setAttribute('aria-label',label);
        if (cell.classList.contains('mini-day')) {
          marker.textContent = '休';
          marker.classList.add('calendar-holiday-rest');
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
body:is(.summary-page,.travel-page) .calendar-holiday{position:relative;background:var(--summary-day-bg,${color})!important;color:#71152d!important;border-color:${color}!important}
body:is(.summary-page,.travel-page) :is(.summary-day,.big-day).calendar-holiday{border-width:1px}
body:is(.summary-page,.travel-page) .calendar-holiday.today{box-shadow:inset 0 0 0 2px var(--purple)}
body:is(.summary-page,.travel-page) .calendar-holiday .day-number{color:#71152d}
.calendar-holiday-label{display:block;color:#71152d;font-size:11px;line-height:1.4;margin:0 0 5px;overflow-wrap:anywhere}
.mini-day .calendar-holiday-label{display:inline-flex;margin:0;align-items:center;justify-content:center}
body:is(.summary-page,.travel-page) .mini-day.calendar-holiday{background:rgba(195,233,202,0.7)!important;color:#234d32!important;border-color:rgba(195,233,202,0.7)!important}
.mini-day .calendar-holiday-rest{width:14px;height:14px;box-sizing:border-box;border:1.3px solid currentColor;border-radius:50%;color:#e00000;font-size:10px;font-weight:800;line-height:1;flex:none}
body.summary-page .summary-annual .calendar-holiday.has-summary-events::after{display:none}
.holiday-coverage{font-size:12px}
@media(max-width:760px){.travel-month .calendar-holiday-label{font-size:9px}}
`;
  document.head.append(style);
  window.CalendarHolidays = { get, decorate, color };
})();
