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
  }));
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
