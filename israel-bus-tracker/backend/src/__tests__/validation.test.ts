import assert from 'node:assert/strict';
import { test } from 'node:test';

import { AppError } from '../http/errors';
import {
  parseClampedInt,
  parseId,
  parseLatLon,
  parseRouteIdList,
  parseSearchQuery,
  sanitizeSocketRouteIds
} from '../http/validation';

const throws400 = (fn: () => unknown) =>
  assert.throws(fn, (e: unknown) => e instanceof AppError && e.status === 400 && e.code === 'VALIDATION_ERROR');

test('parseLatLon: קלט תקין', () => {
  assert.deepEqual(parseLatLon({ lat: '32.08', lon: '34.78' }), { lat: 32.08, lon: 34.78 });
});

test('parseLatLon: חסר / ריק / לא מספרי / מחוץ לטווח / מערך', () => {
  throws400(() => parseLatLon({}));
  throws400(() => parseLatLon({ lat: '32' }));
  throws400(() => parseLatLon({ lat: '', lon: '' })); // Number('') === 0 לא מתקבל
  throws400(() => parseLatLon({ lat: 'abc', lon: '34' }));
  throws400(() => parseLatLon({ lat: '91', lon: '34' }));
  throws400(() => parseLatLon({ lat: '32', lon: '181' }));
  throws400(() => parseLatLon({ lat: ['1', '2'], lon: '34' }));
  throws400(() => parseLatLon({ lat: 'Infinity', lon: '34' }));
});

test('parseClampedInt: ברירת מחדל, הגבלה לטווח, ודחיית לא-מספרי', () => {
  const o = { min: 100, max: 2000, fallback: 500 };
  assert.equal(parseClampedInt('radius', undefined, o), 500);
  assert.equal(parseClampedInt('radius', '', o), 500);
  assert.equal(parseClampedInt('radius', '50', o), 100);
  assert.equal(parseClampedInt('radius', '99999', o), 2000);
  assert.equal(parseClampedInt('radius', '750.4', o), 750);
  throws400(() => parseClampedInt('radius', 'x', o));
});

test('parseId', () => {
  assert.equal(parseId('id', ' S100 '), 'S100');
  assert.equal(parseId('id', 'קו-5'), 'קו-5');
  throws400(() => parseId('id', ''));
  throws400(() => parseId('id', undefined));
  throws400(() => parseId('id', 'a/b'));
  throws400(() => parseId('id', 'a\u0000b'));
  throws400(() => parseId('id', 'x'.repeat(129)));
});

test('parseSearchQuery', () => {
  assert.equal(parseSearchQuery(undefined), '');
  assert.equal(parseSearchQuery('  5 '), '5');
  throws400(() => parseSearchQuery('x'.repeat(101)));
  throws400(() => parseSearchQuery(['a', 'b']));
});

test('parseRouteIdList: הסרת כפילויות, מגבלה, ותווים אסורים', () => {
  assert.deepEqual(parseRouteIdList(undefined), []);
  assert.deepEqual(parseRouteIdList('1, 2,2,,3'), ['1', '2', '3']);
  throws400(() => parseRouteIdList(Array.from({ length: 51 }, (_, i) => String(i)).join(',')));
  throws400(() => parseRouteIdList('1,a\\b'));
});

test('sanitizeSocketRouteIds: לא זורק על payload שבור', () => {
  assert.deepEqual(sanitizeSocketRouteIds(undefined), []);
  assert.deepEqual(sanitizeSocketRouteIds(null), []);
  assert.deepEqual(sanitizeSocketRouteIds({ routeIds: 'x' }), []);
  assert.deepEqual(sanitizeSocketRouteIds({ routeIds: ['a', 1, '', 'a', {}, 'b'] }), ['a', 'b']);
  assert.equal(sanitizeSocketRouteIds({ routeIds: Array.from({ length: 200 }, (_, i) => `r${i}`) }).length, 50);
});
