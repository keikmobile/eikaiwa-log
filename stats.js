// Pure functions for the page. Dates are "YYYY-MM-DD" strings in JST.

const DAY_MS = 86400000;

export function todayJst(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo' }).format(now);
}

export function dayNum(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / DAY_MS;
}

export function dateFromNum(n) {
  return new Date(n * DAY_MS).toISOString().slice(0, 10);
}

// Minutes per date. A lesson with duration_min null counts as a lesson day with 0 minutes.
export function minutesByDate(lessons) {
  const map = new Map();
  for (const l of lessons) map.set(l.date, (map.get(l.date) || 0) + (l.duration_min || 0));
  return map;
}

export function totalMinutes(lessons) {
  return lessons.reduce((s, l) => s + (l.duration_min || 0), 0);
}

// The only data that gets published. The raw export stays on the local machine.
// asOf: the DMM day of the export, so the streak does not break just because publish.sh has not run yet.
export function summarize(lessons, asOf) {
  return {
    as_of: asOf,
    total_min: totalMinutes(lessons),
    count: lessons.length,
    minutes_by_date: Object.fromEntries(minutesByDate(lessons)),
    by_month: byMonth(lessons),
    recent: [...lessons].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20)
      .map(({ date, material_title, duration_min }) => ({ date, material_title, duration_min })),
  };
}

// DMM counts a lesson that starts up to 25:30 (01:30 the next morning) as the previous day.
export function lessonDate(r) {
  const date = r.timestamp.slice(0, 10);
  if (r.source === 'nativecamp' || r.timestamp.slice(11, 16) > '01:30') return date;
  return dateFromNum(dayNum(date) - 1);
}

// Lessons from the extension's auto-export ({ schema_version: 1, records }). timestamp is JST.
export function lessonsFromHistory(payload) {
  if (payload?.schema_version !== 1 || !Array.isArray(payload.records)) throw new Error('unknown export format');
  return payload.records.map(r => ({
    date: lessonDate(r),
    material_title: r.material_title ?? null,
    duration_min: r.duration_min ?? null,
    source: r.source,
  }));
}

// Lessons and minutes per month, split by school. Keys are "YYYY-MM".
export function byMonth(lessons) {
  const out = {};
  for (const l of lessons) {
    const m = out[l.date.slice(0, 7)] ||= { dmm: 0, nc: 0, min: 0 };
    m[l.source === 'nativecamp' ? 'nc' : 'dmm']++;
    m.min += l.duration_min || 0;
  }
  return out;
}

// DMM's day ends at 25:30, so until 01:30 it is still the previous day.
export function dmmToday(now = new Date()) {
  return todayJst(new Date(now.getTime() - 90 * 60000));
}

// Consecutive lesson days ending today, or yesterday if there is no lesson yet today.
// mins: Map of date → minutes (a day with 0 minutes still counts).
export function streak(mins, today) {
  let end = dayNum(today);
  if (!mins.has(today)) end--;
  let days = 0;
  while (mins.has(dateFromNum(end - days))) days++;
  return { days, since: days ? dateFromNum(end - days + 1) : null };
}

// Minutes this week (Sun–Sat), month and year up to asOf, each paired with the same span of the previous period.
export function periodMinutes(mins, asOf) {
  const sum = (from, to) => {
    let t = 0;
    for (let n = from; n <= to; n++) t += mins.get(dateFromNum(n)) || 0;
    return t;
  };
  const [y, m, d] = asOf.split('-').map(Number);
  const end = dayNum(asOf);
  const week = end - new Date(end * DAY_MS).getUTCDay();
  const month = dayNum(`${asOf.slice(0, 7)}-01`);
  const prevMonth = Date.UTC(y, m - 2, 1) / DAY_MS;
  const year = dayNum(`${y}-01-01`);
  const prevYear = dayNum(`${y - 1}-01-01`);
  return {
    week: [sum(week, end), sum(week - 7, end - 7)],
    month: [sum(month, end), sum(prevMonth, Math.min(prevMonth + d - 1, month - 1))],
    year: [sum(year, end), sum(prevYear, Math.min(prevYear + end - year, year - 1))],
  };
}

// Daily News lessons from exactly 1, 7 and 30 days before today (JST), oldest first. Takes raw export records.
// The date is timestamp.slice(0, 10), not lessonDate(): the review spec uses the plain JST date.
export function dwmReview(records, today) {
  const labels = new Map([[1, '1日前'], [7, '1週間前'], [30, '1ヶ月前']]
    .map(([n, label]) => [dateFromNum(dayNum(today) - n), label]));
  return records
    .filter(r => r.lesson_type?.includes('デイリーニュース') && labels.has(r.timestamp.slice(0, 10)))
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    .map(r => ({
      label: labels.get(r.timestamp.slice(0, 10)),
      date: r.timestamp.slice(0, 10),
      source: r.source,
      title: r.material_title ?? r.lesson_type,
    }));
}

// Daily News titles taken most often for one source, top n. Ties: title order. Lessons without a title are skipped.
export function topArticles(records, source, n = 15) {
  const c = new Map();
  for (const r of records) {
    if (r.source === source && r.lesson_type?.includes('デイリーニュース') && r.material_title) {
      c.set(r.material_title, (c.get(r.material_title) || 0) + 1);
    }
  }
  return [...c].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n)
    .map(([title, count]) => ({ title, count }));
}

// Heatmap color level 1–4 for a day's minutes (CSS --h1 … --h4).
export function heatLevel(min) {
  return min >= 75 ? 4 : min >= 50 ? 3 : min >= 25 ? 2 : 1;
}

// ---- Monthly trend and calendar. HTML strings for innerHTML; colors match the extension's report.

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// 90 → "1h30m", 60 → "1h", 25 → "25m", 0 → ""
const fmtMin = min => {
  if (!min) return '';
  const h = Math.floor(min / 60), m = min % 60;
  return h > 0 ? `${h}h${m > 0 ? m + 'm' : ''}` : `${m}m`;
};

// One stacked bar per month (DMM dark green, NC light green; heatmap colors). Under each January: year and yearly total.
export function monthlyChartSvg(byMonth) {
  const keys = Object.keys(byMonth).sort();
  if (keys.length === 0) return '';
  // Every month from the first to the last, so a month without lessons keeps its slot as a 0 bar.
  const months = [];
  let [y, m] = keys[0].split('-').map(Number);
  for (let ym = keys[0]; ym <= keys.at(-1); ym = `${y}-${String(m).padStart(2, '0')}`) {
    months.push(ym);
    if (++m > 12) { y++; m = 1; }
  }
  byMonth = Object.fromEntries(months.map(ym => [ym, byMonth[ym] ?? { dmm: 0, nc: 0, min: 0 }]));
  const counts = months.map(m => byMonth[m].dmm + byMonth[m].nc);
  const H = 100;
  const pad = { l: 4, r: 4, t: 8, b: 22 };
  const W = Math.max(240, months.length * 10 + pad.l + pad.r); // 10px per bar
  const maxC = Math.max(...counts);
  const slotW = (W - pad.l - pad.r) / months.length;
  const barW = Math.max(1, slotW - 2);
  const plotH = H - pad.t - pad.b;
  const bars = months.map((m, i) => {
    const x = (pad.l + i * slotW).toFixed(1);
    const dmmH = maxC > 0 ? (byMonth[m].dmm / maxC) * plotH : 0;
    const ncH = maxC > 0 ? (byMonth[m].nc / maxC) * plotH : 0;
    return `<rect x="${x}" y="${(H - pad.b - dmmH).toFixed(1)}" width="${barW.toFixed(1)}" height="${dmmH.toFixed(1)}" style="fill:var(--h4)"/>`
      + `<rect x="${x}" y="${(H - pad.b - dmmH - ncH).toFixed(1)}" width="${barW.toFixed(1)}" height="${ncH.toFixed(1)}" style="fill:var(--h2)"/>`;
  }).join('');
  const yCount = {}, yMin = {};
  months.forEach((m, i) => {
    const y = m.slice(0, 4);
    yCount[y] = (yCount[y] || 0) + counts[i];
    yMin[y] = (yMin[y] || 0) + byMonth[m].min;
  });
  const labels = months.map((m, i) => {
    if (!m.endsWith('-01')) return '';
    const y = m.slice(0, 4);
    const x = (pad.l + i * slotW + slotW / 2).toFixed(1);
    return `<text x="${x}" y="${H - 11}" text-anchor="middle" fill="#999" font-size="10" font-family="sans-serif">${esc(y)}</text>`
      + `<text x="${x}" y="${H - 1}" text-anchor="middle" fill="#bbb" font-size="8" font-family="sans-serif">${esc(`${yCount[y]}回 / ${Math.floor(yMin[y] / 60)}h`)}</text>`;
  }).join('');
  const svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Lessons per month">${bars}${labels}</svg>`;
  // Wide chart: scroll box; direction:rtl starts it at the right end (newest month).
  const wrap = W > 760
    ? `<div style="overflow-x:auto;direction:rtl;padding-bottom:4px;"><div style="direction:ltr;display:inline-block;">${svg}</div></div>`
    : svg;
  return wrap;
}

const DOW = ['日', '月', '火', '水', '木', '金', '土'];

// One month grid (Sun–Sat). ym: "2026-10", mins: summary.minutes_by_date, today: todayJst()
export function calendarMonthHtml(ym, mins, today) {
  const [yr, mo] = ym.split('-').map(Number); // mo: 1–12
  const isCur = today.startsWith(ym);
  const todayD = isCur ? Number(today.slice(8, 10)) : -1;
  const daysInMonth = new Date(Date.UTC(yr, mo, 0)).getUTCDate();
  const firstDow = new Date(Date.UTC(yr, mo - 1, 1)).getUTCDay();
  let total = 0;
  const dayCells = Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1;
    const m = mins[`${ym}-${String(d).padStart(2, '0')}`] || 0;
    total += m;
    const isToday = d === todayD;
    const isPast = isCur ? d < todayD : today > ym; // future months: no "—"
    const bg = isToday ? 'background:#fff5f5;outline:1px solid #f0a0a0;' : '';
    let inner = `<div style="font-size:9px;color:${isToday ? '#d62b2b' : '#bbb'};">${d}</div>`;
    if (m > 0) inner += `<div style="font-size:9px;color:var(--h${heatLevel(m)});font-weight:600;line-height:1.2;">${fmtMin(m)}</div>`;
    else if (isPast) inner += '<div style="font-size:8px;color:#eee;line-height:1.2;">—</div>';
    return `<div style="text-align:center;padding:2px 1px;border-radius:3px;${bg}">${inner}</div>`;
  }).join('');
  const dowCells = DOW.map((d, i) =>
    `<div style="text-align:center;font-size:9px;color:${i === 0 ? '#e08080' : i === 6 ? '#8090d8' : '#bbb'};padding-bottom:2px;">${d}</div>`).join('');
  const totalLabel = total ? `<span style="font-weight:400;color:#bbb;margin-left:5px;">${fmtMin(total)}</span>` : '';
  return `<div style="display:inline-block;vertical-align:top;margin:0 16px 16px 0;min-width:196px;">
    <div style="font-size:12px;color:#666;font-weight:600;text-align:center;margin-bottom:6px;">${yr}年${mo}月${totalLabel}</div>
    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:1px;margin-bottom:2px;">${dowCells}</div>
    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:1px;">${'<div></div>'.repeat(firstDow)}${dayCells}</div>
  </div>`;
}

// Months that have lessons, grouped by year. Months oldest first.
export function calendarMonthsByYear(mins) {
  const byYear = {};
  for (const ym of [...new Set(Object.keys(mins).map(d => d.slice(0, 7)))].sort()) {
    (byYear[ym.slice(0, 4)] ||= []).push(ym);
  }
  return byYear;
}
