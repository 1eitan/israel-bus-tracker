import assert from 'node:assert/strict';
import { test } from 'node:test';

import { colorFromString, cumulativeDistances, haversine, pointAtDistance, readableTextColor } from '../utils/geo';

test('haversine: 0 לאותה נקודה, ~ק"מ בין שתי נקודות בת"א', () => {
  assert.equal(haversine({ lat: 32, lon: 34 }, { lat: 32, lon: 34 }), 0);
  const d = haversine({ lat: 32.0853, lon: 34.7818 }, { lat: 32.0853, lon: 34.7918 });
  assert.ok(d > 900 && d < 1000, String(d));
});

test('pointAtDistance: חוסם לקצוות המסלול', () => {
  const shape = [{ lat: 32, lon: 34 }, { lat: 32, lon: 34.01 }];
  const cum = cumulativeDistances(shape);
  assert.equal(pointAtDistance(shape, cum, -5).lon, 34);
  assert.equal(pointAtDistance(shape, cum, 1e9).lon, 34.01);
  assert.deepEqual(pointAtDistance([], [0], 1), { lat: 0, lon: 0, bearing: 0 });
});

test('צבעים: יציב ותקין', () => {
  assert.equal(colorFromString('5'), colorFromString('5'));
  assert.match(colorFromString('5'), /^#[0-9a-f]{6}$/);
  assert.equal(readableTextColor('#ffffff'), '#0f172a');
  assert.equal(readableTextColor('#000000'), '#ffffff');
  assert.equal(readableTextColor('bad'), '#ffffff');
});
