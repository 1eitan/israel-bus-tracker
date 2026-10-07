import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { describeDelay, etaTone, formatEtaText, minutesUntil, truncate } from '../src/lib/format';
import { rankNearbyStops } from '../src/lib/nearby';

const stop = (id: string, name: string, lat: number, lon: number) => ({ id, name, lat, lon });
const item = (id: string, name: string, lat: number, lon: number, distanceM = 9999) => ({
  stop: stop(id, name, lat, lon),
  distanceM
});

const ORIGIN = { lat: 32.0853, lon: 34.7818 };

describe('rankNearbyStops', () => {
  it('מחשב מרחק מחדש וממיין מהקרוב לרחוק (מתעלם מהמרחק הישן מהשרת)', () => {
    const far = item('far', 'רחוקה', 32.0953, 34.7818, 1); // ~1.1 ק"מ
    const near = item('near', 'קרובה', 32.0863, 34.7818, 99999); // ~110 מ'
    const ranked = rankNearbyStops([far, near], ORIGIN);
    assert.deepEqual(ranked.map((r) => r.stop.id), ['near', 'far']);
    assert.ok(ranked[0].distanceM > 90 && ranked[0].distanceM < 130, String(ranked[0].distanceM));
  });

  it('מסנן כפילויות, קואורדינטות לא תקינות ותחנות מעבר לטווח', () => {
    const items = [
      item('a', 'א', 32.0855, 34.7818),
      item('a', 'א (כפולה)', 32.0855, 34.7818),
      item('bad', 'שבורה', Number.NaN, 34.78),
      item('zero', 'אפס', 0, 0),
      item('old', 'נתון ישן', 32.2, 34.9)
    ];
    const ranked = rankNearbyStops(items, ORIGIN, 1000);
    assert.deepEqual(ranked.map((r) => r.stop.id), ['a']);
  });

  it('מקור לא תקין => רשימה ריקה', () => {
    assert.deepEqual(rankNearbyStops([item('a', 'א', 32.0855, 34.7818)], { lat: Number.NaN, lon: 1 }), []);
  });

  it('שוויון במרחק: מיון לפי שם, ולא משנה את הקלט', () => {
    const items = [item('b', 'בבב', 32.0863, 34.7818), item('a', 'אאא', 32.0863, 34.7818)];
    const copy = JSON.stringify(items);
    assert.deepEqual(rankNearbyStops(items, ORIGIN).map((r) => r.stop.id), ['a', 'b']);
    assert.equal(JSON.stringify(items), copy);
  });
});

describe('format', () => {
  it('describeDelay: בזמן / עיכוב / מקדים', () => {
    assert.deepEqual(describeDelay(30), { tone: 'ontime', label: 'בזמן' });
    assert.deepEqual(describeDelay(-59), { tone: 'ontime', label: 'בזמן' });
    assert.deepEqual(describeDelay(60), { tone: 'late', label: 'עיכוב של דקה' });
    assert.deepEqual(describeDelay(180), { tone: 'late', label: 'עיכוב של 3 דקות' });
    assert.equal(describeDelay(300).tone, 'verylate');
    assert.deepEqual(describeDelay(-120), { tone: 'early', label: 'מקדים ב-2 דקות' });
  });

  it('formatEtaText ו-minutesUntil סביב "עכשיו"', () => {
    const now = 1_700_000_000_000;
    const at = (sec: number) => now / 1000 + sec;
    assert.equal(formatEtaText(at(-30), now), 'עכשיו');
    assert.equal(formatEtaText(at(45), now), 'עכשיו');
    assert.equal(formatEtaText(at(46), now), '1 דק׳');
    assert.equal(formatEtaText(at(125), now), '3 דק׳');
    assert.equal(minutesUntil(at(-500), now), 0);
    assert.equal(minutesUntil(at(61), now), 2);
  });

  it('etaTone: עיכוב קודם לקרבה', () => {
    const now = 1_700_000_000_000;
    const at = (sec: number) => now / 1000 + sec;
    assert.equal(etaTone(at(30), 400, now), 'late');
    assert.equal(etaTone(at(30), 0, now), 'now');
    assert.equal(etaTone(at(240), 0, now), 'soon');
    assert.equal(etaTone(at(900), 0, now), 'normal');
  });

  it('truncate', () => {
    assert.equal(truncate('קצר', 10), 'קצר');
    assert.equal(truncate('טקסט ארוך מאוד', 6), 'טקסט…');
  });
});
