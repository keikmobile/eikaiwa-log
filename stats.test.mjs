// Run: node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { todayJst, dayNum, dateFromNum, totalMinutes, minutesByDate, summarize, lessonsFromHistory, lessonDate, dmmToday, streak, periodMinutes, dwmReview, topArticles, byMonth, heatLevel, monthlyChartSvg, calendarMonthHtml, calendarMonthsByYear } from './stats.js';

const L = (date, duration_min = 25) => ({ date, material_title: 't', material_title_ja: null, duration_min });

test('todayJst uses Tokyo time', () => {
  assert.equal(todayJst(new Date('2026-10-12T16:00:00Z')), '2026-10-13');
});

test('dayNum / dateFromNum round trip across a month end', () => {
  assert.equal(dateFromNum(dayNum('2026-09-30') + 1), '2026-10-01');
});

test('null minutes count as 0', () => {
  const ls = [L('2026-10-01', 25), L('2026-10-01', null)];
  assert.equal(totalMinutes(ls), 25);
  assert.equal(minutesByDate(ls).get('2026-10-01'), 25);
});

test('summarize keeps only public totals and the newest 20', () => {
  const ls = Array.from({ length: 25 }, (_, i) => L(dateFromNum(dayNum('2026-01-01') + i)));
  ls.push(L('2026-01-01', null));
  const s = summarize(ls);
  assert.equal(s.count, 26);
  assert.equal(s.total_min, 25 * 25);
  assert.equal(s.minutes_by_date['2026-01-01'], 25);
  assert.equal(s.recent.length, 20);
  assert.equal(s.recent[0].date, '2026-01-25');
  assert.deepEqual(Object.keys(s.recent[0]), ['date', 'material_title', 'duration_min']);
});

test('lessonsFromHistory drops private fields and keeps untitled lessons', () => {
  const payload = { schema_version: 1, records: [
    { timestamp: '2026-10-14T20:30:00', teacher_en: 'Secret', material_title: 'A', duration_min: 25 },
    { timestamp: '2026-10-15T07:00:00', teacher_en: 'Secret' },
  ] };
  const s = summarize(lessonsFromHistory(payload));
  assert.equal(s.count, 2);
  assert.equal(s.recent[0].material_title, null);
  assert.ok(!JSON.stringify(s).includes('Secret'));
  assert.throws(() => lessonsFromHistory([]), /unknown export format/);
});

test('DMM lessons up to 25:30 belong to the previous day', () => {
  assert.equal(lessonDate({ timestamp: '2026-10-01T01:30:00' }), '2026-09-30');
  assert.equal(lessonDate({ timestamp: '2026-10-01T00:00:00', source: 'dmm' }), '2026-09-30');
  assert.equal(lessonDate({ timestamp: '2026-10-01T02:00:00' }), '2026-10-01');
  assert.equal(lessonDate({ timestamp: '2026-10-01T00:30:00', source: 'nativecamp' }), '2026-10-01');
});

test('streak counts back from today, or from yesterday if today is empty', () => {
  const m = new Map([['2026-10-10', 25], ['2026-10-12', 0], ['2026-10-13', 50], ['2026-10-14', 25]]);
  assert.deepEqual(streak(m, '2026-10-14'), { days: 3, since: '2026-10-12' });
  assert.deepEqual(streak(m, '2026-10-15'), { days: 3, since: '2026-10-12' });
  assert.deepEqual(streak(m, '2026-10-16'), { days: 0, since: null });
});

test('dmmToday stays on the previous day until 01:30 JST', () => {
  assert.equal(dmmToday(new Date('2026-10-14T16:20:00Z')), '2026-10-14'); // 01:20 JST on the 15th
  assert.equal(dmmToday(new Date('2026-10-14T16:40:00Z')), '2026-10-15'); // 01:40 JST
});

test('summarize records the export day for the streak', () => {
  assert.equal(summarize([L('2026-10-18')], '2026-10-18').as_of, '2026-10-18');
});

test('periodMinutes compares with the same span of the previous period', () => {
  const m = new Map([
    ['2026-03-01', 25], ['2026-03-03', 50],            // this week (Sun 3/1 – Tue 3/3) and this month
    ['2026-02-22', 25], ['2026-02-25', 25],            // last week: only Sun–Tue counts, so 2/25 (Wed) is out
    ['2026-02-01', 30], ['2026-02-04', 30],            // last month: only days 1–3 count
    ['2025-01-01', 60], ['2025-03-03', 60], ['2025-03-04', 60], // last year up to the same day of year (62)
  ]);
  const p = periodMinutes(m, '2026-03-03');
  assert.deepEqual(p.week, [75, 25]);
  assert.deepEqual(p.month, [75, 30]);
  assert.deepEqual(p.year, [75 + 25 + 25 + 30 + 30, 120]);
});

test('periodMinutes wraps January back to December', () => {
  const p = periodMinutes(new Map([['2025-12-31', 25], ['2025-12-01', 10]]), '2026-01-31');
  assert.deepEqual(p.month, [0, 35]);
});

test('dwmReview picks Daily News from exactly 1, 7 and 30 days ago, oldest first', () => {
  const DN = 'オリジナル教材 - デイリーニュース';
  const R = (timestamp, lesson_type = DN, source = 'dmm', material_title = 'T') => ({ timestamp, lesson_type, source, material_title });
  const records = [
    R('2026-10-21T08:30:00', DN, 'dmm', null),
    R('2026-10-20T08:30:00'),
    R('2026-10-15T23:00:00', 'デイリーニュース', 'nativecamp', 'NC'),
    R('2026-10-15T07:00:00', 'フリートーク'),
    R('2026-10-15T06:00:00', null),
    R('2026-09-22T08:00:00', DN, 'dmm', 'M'),
    R('2026-09-21T08:00:00'),
  ];
  assert.deepEqual(dwmReview(records, '2026-10-22'), [
    { label: '1ヶ月前', date: '2026-09-22', source: 'dmm', title: 'M' },
    { label: '1週間前', date: '2026-10-15', source: 'nativecamp', title: 'NC' },
    { label: '1日前', date: '2026-10-21', source: 'dmm', title: DN },
  ]);
  assert.deepEqual(dwmReview([], '2026-10-22'), []);
});

test('topArticles counts Daily News per source, most first, ties by title, top n', () => {
  const R = (source, material_title, lesson_type = 'デイリーニュース') => ({ source, material_title, lesson_type });
  const records = [
    R('dmm', 'B'), R('dmm', 'B'), R('dmm', 'A'), R('dmm', 'C'), R('dmm', 'A'), R('dmm', 'Z'),
    R('dmm', 'X', 'フリートーク'), R('dmm', null), R('nativecamp', 'B'),
  ];
  assert.deepEqual(topArticles(records, 'dmm', 3), [{ title: 'A', count: 2 }, { title: 'B', count: 2 }, { title: 'C', count: 1 }]);
  assert.deepEqual(topArticles(records, 'nativecamp'), [{ title: 'B', count: 1 }]);
});

const LS = (date, source = 'dmm', duration_min = 25) => ({ date, source, duration_min });

test('byMonth: splits DMM and NC, sums minutes', () => {
  assert.deepEqual(byMonth([LS('2026-10-01'), LS('2026-10-02', 'nativecamp', 20), LS('2026-11-01')]), {
    '2026-10': { dmm: 1, nc: 1, min: 45 },
    '2026-11': { dmm: 1, nc: 0, min: 25 },
  });
});

test('byMonth: null minutes count as a lesson with 0 minutes', () => {
  assert.deepEqual(byMonth([LS('2026-10-01', 'dmm', null)]), { '2026-10': { dmm: 1, nc: 0, min: 0 } });
});

test('byMonth: DMM 10-01 00:30 counts in September (01:30 rule)', () => {
  const lessons = lessonsFromHistory({ schema_version: 1, records: [{ timestamp: '2026-10-01T00:30:00', source: 'dmm', duration_min: 25 }] });
  assert.deepEqual(Object.keys(byMonth(lessons)), ['2026-09']);
});

test('monthlyChartSvg: empty → ""', () => {
  assert.equal(monthlyChartSvg({}), '');
});

test('monthlyChartSvg: January gets year and yearly total', () => {
  const html = monthlyChartSvg({ '2026-01': { dmm: 3, nc: 0, min: 90 }, '2026-02': { dmm: 2, nc: 0, min: 60 } });
  assert.ok(html.includes('>2026<'));
  assert.ok(html.includes('5回 / 2h'));
  assert.ok(html.includes('fill:var(--dmm)') && html.includes('fill:var(--nc)')); // DMM dark, NC light green
});

test('monthlyChartSvg: months without lessons keep their slot, across a year end', () => {
  const html = monthlyChartSvg({ '2025-11': { dmm: 1, nc: 0, min: 25 }, '2026-02': { dmm: 1, nc: 0, min: 25 } });
  assert.equal(html.split('<rect').length - 1, 4 * 2); // Nov, Dec, Jan, Feb × (DMM + NC)
  assert.ok(html.includes('>2026<')); // the empty January still gets its label
});

test('heatLevel: same steps as the heatmap', () => {
  assert.deepEqual([0, 24, 25, 49, 50, 74, 75, 200].map(heatLevel), [1, 1, 2, 2, 3, 3, 4, 4]);
});

test('calendarMonthHtml: minutes use the heatmap color', () => {
  assert.ok(calendarMonthHtml('2026-03', { '2026-03-09': 90 }, '2026-10-27').includes('color:var(--h4)'));
});

test('calendarMonthHtml: shows minutes and month total', () => {
  const html = calendarMonthHtml('2026-03', { '2026-03-09': 90 }, '2026-10-27');
  assert.ok(html.includes('2026年3月'));
  assert.ok(html.includes('1h30m'));
});

test('calendarMonthHtml: no "—" after today in the current month', () => {
  const html = calendarMonthHtml('2026-10', {}, '2026-10-02');
  assert.equal(html.split('—').length - 1, 1); // only 10-01
});

test('calendarMonthsByYear: groups months by year', () => {
  assert.deepEqual(calendarMonthsByYear({ '2025-03-01': 25, '2026-03-09': 25, '2026-01-02': 25 }),
    { 2025: ['2025-03'], 2026: ['2026-01', '2026-03'] });
});
