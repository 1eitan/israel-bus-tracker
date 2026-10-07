import assert from 'node:assert/strict';
import { test } from 'node:test';

import { describeProviders } from '../providers';

const base = { demoMode: false, vehiclePositionsUrl: '', siriSmUrl: '' };

test('DEMO: realtime=MOCK, static=MOCK, SIRI לא מיושם', () => {
  const r = describeProviders({ ...base, demoMode: true }, 'demo');
  assert.equal(r.gtfsRealtime.state, 'MOCK');
  assert.equal(r.staticData.state, 'MOCK');
  assert.equal(r.siri.state, 'NOT_IMPLEMENTED');
});

test('מצב חי בלי כתובות: NOT_IMPLEMENTED (לא ממציאים מקור)', () => {
  const r = describeProviders(base, 'none');
  assert.equal(r.gtfsRealtime.state, 'NOT_IMPLEMENTED');
  assert.equal(r.siri.state, 'NOT_IMPLEMENTED');
  assert.equal(r.staticData.state, 'NOT_IMPLEMENTED');
});

test('GTFS-RT מוגדר => REAL, ו-SIRI לא', () => {
  const r = describeProviders({ ...base, vehiclePositionsUrl: 'https://x' }, 'file');
  assert.equal(r.gtfsRealtime.state, 'REAL');
  assert.equal(r.staticData.state, 'REAL');
  assert.equal(r.siri.state, 'NOT_IMPLEMENTED');
});

test('SIRI מוגדר => REAL, והוא עוקף את GTFS-RT (כמו ב-fetcher)', () => {
  const r = describeProviders({ ...base, vehiclePositionsUrl: 'https://x', siriSmUrl: 'https://y' }, 'file');
  assert.equal(r.siri.state, 'REAL');
  assert.equal(r.gtfsRealtime.state, 'NOT_IMPLEMENTED');
});

test('DEMO_MODE מנטרל SIRI גם אם הוגדר', () => {
  const r = describeProviders({ demoMode: true, vehiclePositionsUrl: '', siriSmUrl: 'https://y' }, 'demo');
  assert.equal(r.siri.state, 'NOT_IMPLEMENTED');
});

test('ייבוא GTFS גולמי ותכנון מסלול: תמיד NOT_IMPLEMENTED', () => {
  const r = describeProviders(base, 'file');
  assert.equal(r.gtfsStaticImport.state, 'NOT_IMPLEMENTED');
  assert.equal(r.routePlanner.state, 'NOT_IMPLEMENTED');
});
