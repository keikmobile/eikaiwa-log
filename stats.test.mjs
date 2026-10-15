// Run: node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { todayJst, dayNum, dateFromNum, totalMinutes, minutesByDate, summarize } from './stats.js';

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
