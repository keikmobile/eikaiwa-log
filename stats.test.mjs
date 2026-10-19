// Run: node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { todayJst, dayNum, dateFromNum, totalMinutes, minutesByDate, summarize, lessonsFromHistory, lessonDate, dmmToday, streak } from './stats.js';

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
