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
export function summarize(lessons) {
  return {
    total_min: totalMinutes(lessons),
    count: lessons.length,
    minutes_by_date: Object.fromEntries(minutesByDate(lessons)),
    recent: [...lessons].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20)
      .map(({ date, material_title, duration_min }) => ({ date, material_title, duration_min })),
  };
}
