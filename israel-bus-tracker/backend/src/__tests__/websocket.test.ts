import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, before, test } from 'node:test';
import { io as connect, type Socket } from 'socket.io-client';

import { WebSocketService } from '../services/websocket.service';
import { FakeFetcher, vehicle } from './helpers';

const fetcher = new FakeFetcher();
let server: http.Server;
let service: WebSocketService;
let url = '';
const sockets: Socket[] = [];

before(async () => {
  fetcher.vehicles.set('a', vehicle('a', 'R1'));
  fetcher.vehicles.set('b', vehicle('b', 'R2'));
  server = http.createServer();
  service = new WebSocketService(server, fetcher as never, ['*']);
  await new Promise<void>((r) => server.listen(0, r));
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(async () => {
  sockets.forEach((s) => s.close());
  await service.close();
  await new Promise<void>((r) => server.close(() => r()));
});

const client = () => {
  const s = connect(url, { transports: ['websocket'], reconnection: true, forceNew: true });
  sockets.push(s);
  return s;
};
const once = <T = any>(s: Socket, ev: string) => new Promise<T>((r) => s.once(ev, r));
const settle = (ms = 80) => new Promise((r) => setTimeout(r, ms));

test('connect: מקבל server:status', async () => {
  const s = client();
  const status = await once(s, 'server:status');
  assert.equal(status.ok, true);
});

test('subscribe לקו -> snapshot של הקו בלבד', async () => {
  const s = client();
  await once(s, 'connect');
  s.emit('subscribe', { routeIds: ['R1'] });
  const snap = await once(s, 'snapshot');
  assert.deepEqual(snap.vehicles.map((v: any) => v.id), ['a']);
});

test('subscribe עם payload שבור לא מפיל את השרת ומחזיר הכול', async () => {
  const s = client();
  await once(s, 'connect');
  s.emit('subscribe', null as never);
  const snap = await once(s, 'snapshot');
  assert.equal(snap.vehicles.length, 2);
});

test('vehicles:update מגיע רק למנויים, פעם אחת (בלי כפילות)', async () => {
  const r1 = client(); const r2 = client(); const all = client();
  await Promise.all([once(r1, 'connect'), once(r2, 'connect'), once(all, 'connect')]);
  r1.emit('subscribe', { routeIds: ['R1'] }); r2.emit('subscribe', { routeIds: ['R2'] }); all.emit('subscribe', { routeIds: ['*'] });
  await Promise.all([once(r1, 'snapshot'), once(r2, 'snapshot'), once(all, 'snapshot')]);
  const got = { r1: 0, r2: 0, all: 0 };
  r1.on('vehicles:update', () => got.r1++); r2.on('vehicles:update', () => got.r2++); all.on('vehicles:update', () => got.all++);
  fetcher.emit('vehicles', [vehicle('a', 'R1', 32.09)]);
  await settle();
  assert.deepEqual(got, { r1: 1, r2: 0, all: 1 });
});

test('resubscribe מחליף מנויים (אין צבירת חדרים)', async () => {
  const s = client();
  await once(s, 'connect');
  s.emit('subscribe', { routeIds: ['R1'] }); await once(s, 'snapshot');
  s.emit('subscribe', { routeIds: ['R2'] }); await once(s, 'snapshot');
  let updates = 0;
  s.on('vehicles:update', () => updates++);
  fetcher.emit('vehicles', [vehicle('a', 'R1')]);
  await settle();
  assert.equal(updates, 0);
});

test('unsubscribe: מפסיק עדכונים ושולח vehicles:remove לרכבים שהוסרו', async () => {
  const s = client();
  await once(s, 'connect');
  s.emit('subscribe', { routeIds: ['R1', 'R2'] }); await once(s, 'snapshot');
  const removed = once(s, 'vehicles:remove');
  s.emit('unsubscribe', { routeIds: ['R1'] });
  assert.deepEqual((await removed).ids, ['a']);
  let updates = 0;
  s.on('vehicles:update', () => updates++);
  fetcher.emit('vehicles', [vehicle('a', 'R1')]);
  await settle();
  assert.equal(updates, 0);
});

test('vehicles:remove מה-fetcher משודר לכולם', async () => {
  const s = client();
  await once(s, 'connect');
  const p = once(s, 'vehicles:remove');
  fetcher.emit('removed', ['zzz']);
  assert.deepEqual((await p).ids, ['zzz']);
});

test('disconnect + reconnect: snapshot חדש אחרי חיבור מחדש, בלי listeners כפולים בשרת', async () => {
  const before = fetcher.listenerCount('vehicles');
  const s = client();
  await once(s, 'connect');
  s.emit('subscribe', { routeIds: ['*'] }); await once(s, 'snapshot');
  s.disconnect();
  await settle();
  s.connect();
  await once(s, 'connect');
  s.emit('subscribe', { routeIds: ['*'] });
  const snap = await once(s, 'snapshot');
  assert.equal(snap.vehicles.length, 2);
  assert.equal(fetcher.listenerCount('vehicles'), before); // מנוי יחיד של ה-service על ה-fetcher
});

test('close() מסיר את ה-listeners מה-fetcher', async () => {
  const f = new FakeFetcher();
  const srv = http.createServer();
  const svc = new WebSocketService(srv, f as never, ['*']);
  assert.equal(f.listenerCount('vehicles'), 1);
  await svc.close();
  assert.equal(f.listenerCount('vehicles'), 0);
  assert.equal(f.listenerCount('removed'), 0);
});
