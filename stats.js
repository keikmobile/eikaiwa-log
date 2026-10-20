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
