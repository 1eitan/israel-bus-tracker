import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import http from 'node:http';
import { after, before, test } from 'node:test';

import { createApp } from '../app';
import { FakeFetcher, testConfig, vehicle } from './helpers';

const fetcher = new FakeFetcher();
fetcher.vehicles.set('v1', vehicle('v1', 'R1'));
let server: http.Server;
let base = '';

before(async () => {
  server = http.createServer(createApp(fetcher as never, testConfig));
  await new Promise<void>((r) => server.listen(0, r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => new Promise<void>((r) => server.close(() => r())));

const get = async (path: string, init?: RequestInit) => {
  const res = await fetch(base + path, init);
  return { res, body: (await res.json()) as any };
};
const expectError = (r: { res: Response; body: any }, status: number, code: string) => {
  assert.equal(r.res.status, status);
  assert.equal(typeof r.body.error, 'string');
  assert.equal(r.body.code, code);
};

test('health: סטטוס + providers', async () => {
  const { res, body } = await get('/api/health');
  assert.equal(res.status, 200);
  assert.equal(body.status, 'ok');
  assert.deepEqual(body.providers, { marker: 'providers' });
});

test('routes / routes/:id / stops', async () => {
  assert.equal((await get('/api/routes')).res.status, 200);
  assert.equal((await get('/api/routes/R1')).res.status, 200);
  expectError(await get('/api/routes/nope'), 404, 'NOT_FOUND');
  assert.equal((await get('/api/stops')).body.length, 1);
});

test('nearby: ולידציה', async () => {
  expectError(await get('/api/stops/nearby'), 400, 'VALIDATION_ERROR');
  expectError(await get('/api/stops/nearby?lat=&lon='), 400, 'VALIDATION_ERROR');
  expectError(await get('/api/stops/nearby?lat=99&lon=34'), 400, 'VALIDATION_ERROR');
  expectError(await get('/api/stops/nearby?lat=32&lon=34&radius=abc'), 400, 'VALIDATION_ERROR');
  const ok = await get('/api/stops/nearby?lat=32.08&lon=34.78');
  assert.equal(ok.res.status, 200);
  assert.equal(ok.body.stops.length, 1);
  assert.ok(fetcher.refreshed.includes('S1'));
});

test('arrivals: 200 / 404', async () => {
  assert.equal((await get('/api/stops/S1/arrivals')).res.status, 200);
  expectError(await get('/api/stops/zzz/arrivals'), 404, 'NOT_FOUND');
});

test('vehicles + upcoming + search', async () => {
  assert.equal((await get('/api/vehicles')).body.length, 1);
  assert.equal((await get('/api/vehicles?routes=R2')).body.length, 0);
  expectError(await get('/api/vehicles?routes=a%5Cb'), 400, 'VALIDATION_ERROR');
  assert.equal((await get('/api/vehicles/v1/upcoming')).res.status, 200);
  expectError(await get('/api/vehicles/nope/upcoming'), 404, 'NOT_FOUND');
  assert.equal((await get('/api/search?q=x')).body.stops.length, 1);
  expectError(await get(`/api/search?q=${'x'.repeat(101)}`), 400, 'VALIDATION_ERROR');
});

test('שגיאות כלליות: 404 לנתיב לא קיים, JSON שבור', async () => {
  expectError(await get('/api/nope'), 404, 'ROUTE_NOT_FOUND');
  const r = await get('/api/health', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{bad' });
  expectError(r, 400, 'INVALID_JSON');
});

test('CORS: כותרת Access-Control-Allow-Origin', async () => {
  const { res } = await get('/api/health', { headers: { Origin: 'http://example.com' } });
  assert.equal(res.headers.get('access-control-allow-origin'), '*');
});

test('CORS עם allow-list: origin לא מורשה לא מקבל כותרת', async () => {
  const s = http.createServer(createApp(fetcher as never, { corsOrigin: ['http://ok.example'] }));
  await new Promise<void>((r) => s.listen(0, r));
  const url = `http://127.0.0.1:${(s.address() as AddressInfo).port}/api/health`;
  const bad = await fetch(url, { headers: { Origin: 'http://evil.example' } });
  const good = await fetch(url, { headers: { Origin: 'http://ok.example' } });
  assert.equal(bad.headers.get('access-control-allow-origin'), null);
  assert.equal(good.headers.get('access-control-allow-origin'), 'http://ok.example');
  await new Promise<void>((r) => s.close(() => r()));
});

test('שגיאה לא צפויה מה-fetcher -> 500 אחיד', async () => {
  const orig = fetcher.getStops;
  const log = console.error;
  console.error = () => {};
  fetcher.getStops = () => { throw new Error('boom'); };
  try {
    expectError(await get('/api/stops'), 500, 'INTERNAL_ERROR');
  } finally {
    fetcher.getStops = orig;
    console.error = log;
  }
});
