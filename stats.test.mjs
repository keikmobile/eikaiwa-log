// Run: node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { todayJst, dayNum, dateFromNum, totalMinutes, minutesByDate, summarize, lessonsFromHistory, lessonDate, dmmToday, streak, periodMinutes } from './stats.js';

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
