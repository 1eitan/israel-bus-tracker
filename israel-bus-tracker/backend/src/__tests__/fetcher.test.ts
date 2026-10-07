import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { GtfsFetcherService } from '../services/gtfsFetcher.service';
import { testConfig, vehicle } from './helpers';

const internals = (f: GtfsFetcherService) => f as unknown as {
  loadStaticData(): void;
  applyFrame(v: ReturnType<typeof vehicle>[], t: never[]): void;
};

function withStatic(data: unknown) {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'gtfs-')), 'static.json');
  fs.writeFileSync(file, JSON.stringify(data));
  const f = new GtfsFetcherService({ ...testConfig, staticDataPath: file });
  internals(f).loadStaticData();
  return f;
}

test('פענוח נתונים סטטיים (JSON): נרמול טיפוסים, צבעים ברירת מחדל', () => {
  const f = withStatic({
    routes: [{ id: 5, shortName: 5, stopIds: [1, 2] }],
    stops: [{ id: 1, name: 'א', lat: '32.1', lon: '34.8' }, { id: 2, code: 'c2', name: 'ב', lat: 32.2, lon: 34.9 }]
  });
  const [route] = f.getRouteSummaries();
  assert.equal(route.id, '5');
  assert.match(route.color, /^#[0-9a-f]{6}$/);
  assert.equal(f.getStop('1')?.lat, 32.1);
  assert.equal(f.getStop('1')?.code, '1');
  assert.equal(f.getRouteDetails('5')?.stops.length, 2);
  assert.equal(f.getProviders().staticData.state, 'REAL');
});

test('קובץ סטטי חסר/שבור + מצב חי: אין נתונים ו-NOT_IMPLEMENTED (אין fallback שקט)', () => {
  const f = new GtfsFetcherService({ ...testConfig, staticDataPath: '/nonexistent.json' });
  const log = console.error; console.error = () => {};
  try { internals(f).loadStaticData(); } finally { console.error = log; }
  assert.equal(f.getStops().length, 0);
  assert.equal(f.getProviders().staticData.state, 'NOT_IMPLEMENTED');
});

test('מצב הדגמה: נתוני MOCK', () => {
  const f = new GtfsFetcherService({ ...testConfig, demoMode: true });
  internals(f).loadStaticData();
  assert.ok(f.getStops().length > 0);
  assert.equal(f.getProviders().staticData.state, 'MOCK');
  assert.equal(f.getProviders().gtfsRealtime.state, 'MOCK');
});

test('applyFrame: אין רכבים כפולים, ורק שינויים משודרים', () => {
  const f = new GtfsFetcherService(testConfig);
  const emitted: string[][] = [];
  f.on('vehicles', (c) => emitted.push(c.map((v) => v.id)));
  internals(f).applyFrame([vehicle('a', 'R1'), vehicle('a', 'R1', 32.09), vehicle('b', 'R1')], []);
  assert.equal(f.getVehicles().length, 2);
  internals(f).applyFrame([vehicle('a', 'R1', 32.09)], []); // ללא שינוי
  assert.equal(emitted.length, 1);
});

test('applyFrame: רכב שלא התעדכן מעבר ל-vehicleStaleMs מוסר ומשודר removed', async () => {
  const f = new GtfsFetcherService({ ...testConfig, vehicleStaleMs: 10 });
  const removed: string[] = [];
  f.on('removed', (ids) => removed.push(...ids));
  internals(f).applyFrame([vehicle('a', 'R1')], []);
  await new Promise((r) => setTimeout(r, 30));
  internals(f).applyFrame([], []);
  assert.deepEqual(removed, ['a']);
  assert.equal(f.getVehicles().length, 0);
});

test('search + nearby על נתונים סטטיים', () => {
  const f = withStatic({
    routes: [{ id: 'r1', shortName: '5', longName: 'תל אביב', stopIds: [] }],
    stops: [{ id: 's1', code: '100', name: 'דיזנגוף', lat: 32.08, lon: 34.77 }]
  });
  assert.equal(f.search('5').routes[0].id, 'r1');
  assert.equal(f.search('דיזנגוף').stops[0].id, 's1');
  assert.deepEqual(f.search('   '), { routes: [], stops: [] });
  assert.equal(f.getNearbyStops(32.08, 34.77, 200, 5).length, 1);
  assert.equal(f.getNearbyStops(33.0, 35.0, 200, 5).length, 0);
});
