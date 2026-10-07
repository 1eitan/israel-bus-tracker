import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { fail, notImplemented, ok, type Outcome } from '../src/core/outcome';
import { MockRoutePlannerProvider } from '../src/routing/mock';
import { NotImplementedRoutePlanner } from '../src/routing/notImplemented';
import { planRoute } from '../src/routing/plan';
import { resolveWaypoint, type ResolveDeps } from '../src/routing/resolve';
import type { Itinerary, RoutePlannerProvider, RouteQuery } from '../src/routing/types';
import { MAX_HORIZON_MS, findItineraryProblem, validateRouteQuery } from '../src/routing/validate';

const NOW = 1_700_000_000_000;
const TLV = { lat: 32.0853, lon: 34.7818 };
const JLM = { lat: 31.7683, lon: 35.2137 };

const query = (over: Partial<RouteQuery> = {}): RouteQuery => ({
  origin: TLV,
  destination: JLM,
  time: { mode: 'depart_now' },
  ...over
});

const online = { isOnline: () => true, now: () => NOW };

/** ספק ריגול: סופר קריאות ל-plan */
function spyProvider(result: () => Promise<Outcome<Itinerary[]>>, requiresNetwork = true) {
  const state = { calls: 0 };
  const provider: RoutePlannerProvider = {
    id: 'spy',
    isMock: false,
    requiresNetwork,
    capabilities: new NotImplementedRoutePlanner().capabilities,
    plan: async () => {
      state.calls += 1;
      return result();
    }
  };
  return { provider, state };
}

const goodItinerary = (over: Partial<Itinerary> = {}): Itinerary => ({
  id: 'i',
  source: 'real',
  startTime: NOW,
  endTime: NOW + 600_000,
  durationSec: 600,
  distanceM: 5000,
  walkingDistanceM: 200,
  walkingDurationSec: 160,
  transfers: 0,
  realTime: true,
  disruptions: [],
  legs: [{ type: 'walk', from: TLV, to: JLM, distanceM: 200, durationSec: 160 }],
  ...over
});

describe('Route planner: אין מנוע => NOT_IMPLEMENTED', () => {
  const planner = new NotImplementedRoutePlanner();

  it('plan מחזיר NOT_IMPLEMENTED ולא מסלול / רשימה ריקה', async () => {
    const r = await planRoute(planner, query(), online);
    assert.equal(r.kind, 'not_implemented');
    assert.equal(r.kind === 'not_implemented' && r.feature, 'routing.plan');
  });

  it('NOT_IMPLEMENTED גם offline (לא "אין אינטרנט")', async () => {
    const r = await planRoute(planner, query(), { isOnline: () => false, now: () => NOW });
    assert.equal(r.kind, 'not_implemented');
  });

  it('אין יכולות, ואינו mock', () => {
    assert.equal(planner.isMock, false);
    assert.ok(Object.values(planner.capabilities).every((v) => v === false));
  });

  it('configure = NOT_IMPLEMENTED', async () => {
    assert.equal((await planner.configure({ baseUrl: 'https://x' })).kind, 'not_implemented');
  });
});

describe('Route planner: ולידציה (לפני הספק)', () => {
  it('שאילתה תקינה', () => {
    assert.equal(validateRouteQuery(query(), NOW), null);
    assert.equal(validateRouteQuery(query({ time: { mode: 'depart_at', at: NOW + 3_600_000 } }), NOW), null);
    assert.equal(validateRouteQuery(query({ time: { mode: 'arrive_by', at: NOW + 3_600_000 } }), NOW), null);
  });

  it('קואורדינטות לא תקינות', () => {
    for (const bad of [{ lat: 0, lon: 0 }, { lat: Number.NaN, lon: 1 }, { lat: 91, lon: 0 }, { lat: 1, lon: 181 }]) {
      assert.equal(validateRouteQuery(query({ origin: bad }), NOW)?.code, 'invalid_input');
      assert.equal(validateRouteQuery(query({ destination: bad }), NOW)?.code, 'invalid_input');
    }
  });

  it('מוצא = יעד (קרובים מדי)', () => {
    assert.equal(validateRouteQuery(query({ destination: { lat: TLV.lat + 0.0001, lon: TLV.lon } }), NOW)?.code, 'invalid_input');
  });

  it('זמנים: הגעה בעבר, יציאה רחוקה בעבר, רחוק מדי בעתיד, NaN', () => {
    assert.ok(validateRouteQuery(query({ time: { mode: 'arrive_by', at: NOW - 1 } }), NOW));
    assert.ok(validateRouteQuery(query({ time: { mode: 'depart_at', at: NOW - 3_600_000 } }), NOW));
    assert.equal(validateRouteQuery(query({ time: { mode: 'depart_at', at: NOW - 60_000 } }), NOW), null, 'small skew tolerated');
    assert.ok(validateRouteQuery(query({ time: { mode: 'depart_at', at: NOW + MAX_HORIZON_MS + 1 } }), NOW));
    assert.ok(validateRouteQuery(query({ time: { mode: 'arrive_by', at: Number.NaN } }), NOW));
  });

  it('העדפות: החלפות והליכה', () => {
    assert.equal(validateRouteQuery(query({ preferences: { maxTransfers: 2, maxWalkMeters: 800 } }), NOW), null);
    for (const maxTransfers of [-1, 6, 1.5]) assert.ok(validateRouteQuery(query({ preferences: { maxTransfers } }), NOW));
    for (const maxWalkMeters of [-1, 5001, Number.NaN]) assert.ok(validateRouteQuery(query({ preferences: { maxWalkMeters } }), NOW));
  });

  it('שאילתה לא תקינה לא מגיעה לספק בכלל', async () => {
    const { provider, state } = spyProvider(async () => ok([]));
    const r = await planRoute(provider, query({ origin: { lat: 0, lon: 0 } }), online);
    assert.ok(r.kind === 'error' && r.error.code === 'invalid_input');
    assert.equal(state.calls, 0);
  });
});

describe('Route planner: תכנון', () => {
  it('"אין מסלולים" הוא ok ריק - ולא NOT_IMPLEMENTED', async () => {
    const { provider } = spyProvider(async () => ok([]));
    assert.deepEqual(await planRoute(provider, query(), online), { kind: 'ok', data: [] });
  });

  it('תוצאה תקינה עוברת', async () => {
    const { provider } = spyProvider(async () => ok([goodItinerary()]));
    const r = await planRoute(provider, query(), online);
    assert.ok(r.kind === 'ok' && r.data.length === 1);
  });

  it('offline: שגיאה, והספק (תלוי רשת) לא נקרא', async () => {
    const { provider, state } = spyProvider(async () => ok([goodItinerary()]));
    const r = await planRoute(provider, query(), { isOnline: () => false, now: () => NOW });
    assert.ok(r.kind === 'error' && r.error.code === 'offline' && r.error.retryable);
    assert.equal(state.calls, 0);
  });

  it('ספק מקומי (לא תלוי רשת) עובד offline', async () => {
    const { provider, state } = spyProvider(async () => ok([goodItinerary()]), false);
    const r = await planRoute(provider, query(), { isOnline: () => false, now: () => NOW });
    assert.equal(r.kind, 'ok');
    assert.equal(state.calls, 1);
  });

  it('חריגה מהספק => error ולא קריסה', async () => {
    const { provider } = spyProvider(async () => {
      throw new Error('engine exploded');
    });
    const r = await planRoute(provider, query(), online);
    assert.ok(r.kind === 'error' && r.error.cause === 'engine exploded');
  });

  it('שגיאה מהספק מועברת כמו שהיא (timeout / network)', async () => {
    const { provider } = spyProvider(async () => fail('timeout'));
    const r = await planRoute(provider, query(), online);
    assert.ok(r.kind === 'error' && r.error.code === 'timeout');
  });

  it('NOT_IMPLEMENTED מהספק מועבר', async () => {
    const { provider } = spyProvider(async () => notImplemented('x', 'y'));
    assert.equal((await planRoute(provider, query(), online)).kind, 'not_implemented');
  });

  it('ביטול: signal שבוטל לפני / במהלך', async () => {
    const { provider, state } = spyProvider(async () => ok([goodItinerary()]));
    const pre = new AbortController();
    pre.abort();
    const r1 = await planRoute(provider, query(), { ...online, signal: pre.signal });
    assert.ok(r1.kind === 'error' && r1.error.code === 'cancelled');
    assert.equal(state.calls, 0);

    const during = new AbortController();
    const slow = spyProvider(async () => {
      during.abort();
      return ok([goodItinerary()]);
    });
    const r2 = await planRoute(slow.provider, query(), { ...online, signal: during.signal });
    assert.ok(r2.kind === 'error' && r2.error.code === 'cancelled', 'late result must be dropped');
  });

  it('תשובה לא תקינה מהמנוע נדחית (invalid_response)', async () => {
    const bads: Itinerary[] = [
      goodItinerary({ legs: [] }),
      goodItinerary({ endTime: NOW - 1 }),
      goodItinerary({ durationSec: -5 }),
      goodItinerary({ distanceM: Number.NaN }),
      goodItinerary({ source: 'fake' as never })
    ];
    for (const bad of bads) {
      const { provider } = spyProvider(async () => ok([bad]));
      const r = await planRoute(provider, query(), online);
      assert.ok(r.kind === 'error' && r.error.code === 'invalid_response', JSON.stringify(findItineraryProblem(bad)));
    }
    const { provider } = spyProvider(async () => ({ kind: 'ok', data: 'nope' as never }));
    assert.ok((await planRoute(provider, query(), online)).kind === 'error');
  });
});

describe('Route planner: Mock מסומן כהדגמה', () => {
  it('isMock ו-source=mock על כל מסלול, ללא זמן אמת', async () => {
    const mock = new MockRoutePlannerProvider({ now: () => NOW });
    assert.equal(mock.isMock, true);
    const r = await planRoute(mock, query(), online);
    assert.ok(r.kind === 'ok' && r.data.length === 1);
    if (r.kind !== 'ok') return;
    for (const it of r.data) {
      assert.equal(it.source, 'mock');
      assert.equal(it.realTime, false);
      assert.equal(findItineraryProblem(it), null);
    }
  });

  it('מסלול מוק עקבי: סכום זמנים/הליכה, ושעות לפי depart_at / arrive_by', async () => {
    const mock = new MockRoutePlannerProvider({ now: () => NOW });
    const dep = await planRoute(mock, query({ time: { mode: 'depart_at', at: NOW + 3_600_000 } }), online);
    assert.ok(dep.kind === 'ok');
    if (dep.kind !== 'ok') return;
    const it = dep.data[0];
    assert.equal(it.startTime, NOW + 3_600_000);
    assert.equal(it.endTime - it.startTime, it.durationSec * 1000);
    assert.ok(it.walkingDistanceM <= it.distanceM);

    const arr = await planRoute(mock, query({ time: { mode: 'arrive_by', at: NOW + 7_200_000 } }), online);
    assert.ok(arr.kind === 'ok' && Math.abs(arr.data[0].endTime - (NOW + 7_200_000)) <= 1000);
  });

  it('מוק יכול לדמות כשל / אין מסלולים (למצבי UI)', async () => {
    const failing = new MockRoutePlannerProvider({ failWith: fail('timeout') });
    assert.ok((await planRoute(failing, query(), online)).kind === 'error');
    const empty = new MockRoutePlannerProvider({ empty: true });
    assert.deepEqual(await planRoute(empty, query(), online), { kind: 'ok', data: [] });
  });
});

describe('Route planner: איתור נקודות', () => {
  const deps = (over: Partial<ResolveDeps> = {}): ResolveDeps => ({
    geocode: async () => ({ lat: 32.1, lon: 34.8 }),
    currentLocation: async () => ({ lat: 32.2, lon: 34.9 }),
    ...over
  });

  it('טקסט => geocode', async () => {
    const r = await resolveWaypoint('  דיזנגוף 1 ', 'destination', deps());
    assert.deepEqual(r, { kind: 'ok', data: { lat: 32.1, lon: 34.8, label: 'דיזנגוף 1' } });
  });

  it('מוצא ריק => מיקום נוכחי; יעד ריק => שגיאה', async () => {
    const o = await resolveWaypoint('', 'origin', deps());
    assert.ok(o.kind === 'ok' && o.data.label === 'המיקום שלי');
    assert.ok((await resolveWaypoint('  ', 'destination', deps())).kind === 'error');
  });

  it('מוצא ריק ואין מיקום / מיקום לא תקין / חריגה => שגיאת קלט, בלי להמציא נקודה', async () => {
    for (const currentLocation of [async () => null, async () => ({ lat: 0, lon: 0 }), async () => { throw new Error('x'); }]) {
      const r = await resolveWaypoint('', 'origin', deps({ currentLocation }));
      assert.ok(r.kind === 'error' && r.error.code === 'invalid_input');
    }
  });

  it('geocode לא מצא / החזיר זבל / נכשל ברשת', async () => {
    const none = await resolveWaypoint('xyz', 'destination', deps({ geocode: async () => null }));
    assert.ok(none.kind === 'error' && none.error.code === 'invalid_input');
    const junk = await resolveWaypoint('xyz', 'destination', deps({ geocode: async () => ({ lat: 0, lon: 0 }) }));
    assert.equal(junk.kind, 'error');
    const net = await resolveWaypoint('xyz', 'destination', deps({ geocode: async () => { throw new Error('offline'); } }));
    assert.ok(net.kind === 'error' && net.error.code === 'network');
  });
});
