import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { Route } from '../types/gtfs';
import { SiriService } from '../services/siri.service';
import { testConfig } from './helpers';

// הערה: ה-XML כאן סינתטי - בנוי משמות השדות שהפרסר קורא, לא תגובה אמיתית של משרד התחבורה.
const stop = { id: 'S1', code: '100', name: 'תחנה', lat: 32, lon: 34 };
const resolve = (lineRef: string, name: string): Route => ({
  id: lineRef, shortName: name || lineRef, longName: 'ארוך', agency: '', color: '#123456', textColor: '#ffffff', stopIds: [], shape: []
});
const future = new Date(Date.now() + 5 * 60_000).toISOString();
const aimed = new Date(Date.now() + 4 * 60_000).toISOString();
const visit = (line: string, veh: string, extra = '') => `
  <MonitoredStopVisit>
    <RecordedAtTime>${new Date().toISOString()}</RecordedAtTime>
    <MonitoredVehicleJourney>
      <LineRef>${line}</LineRef><PublishedLineName>${line}א</PublishedLineName>
      <DirectionRef>1</DirectionRef><DestinationName>יעד</DestinationName>
      <VehicleRef>${veh}</VehicleRef>
      <VehicleLocation><Longitude>34.78</Longitude><Latitude>32.08</Latitude></VehicleLocation>
      <MonitoredCall><Order>3</Order><ExpectedArrivalTime>${future}</ExpectedArrivalTime><AimedArrivalTime>${aimed}</AimedArrivalTime></MonitoredCall>
      ${extra}
    </MonitoredVehicleJourney>
  </MonitoredStopVisit>`;
const doc = (inner: string) =>
  `<Siri xmlns="http://www.siri.org.uk/siri"><ServiceDelivery><StopMonitoringDelivery>${inner}</StopMonitoringDelivery></ServiceDelivery></Siri>`;

const svc = new SiriService({ ...testConfig, siriSmUrl: 'https://example.invalid/siri' });

test('parse: tripUpdate + vehicle, עיכוב = צפוי פחות מתוכנן', () => {
  const r = svc.parse(doc(visit('5', 'V1')), stop, resolve);
  assert.equal(r.tripUpdates.length, 1);
  assert.equal(r.tripUpdates[0].routeId, '5');
  assert.equal(r.tripUpdates[0].stopTimeUpdates[0].stopId, 'S1');
  assert.equal(r.tripUpdates[0].delaySeconds, 60);
  assert.equal(r.vehicles.length, 1);
  assert.equal(r.vehicles[0].id, 'V1');
  assert.equal(r.vehicles[0].directionId, 1);
});

test('parse: אותו רכב פעמיים -> רכב אחד (בלי כפילות)', () => {
  const r = svc.parse(doc(visit('5', 'V1') + visit('5', 'V1')), stop, resolve);
  assert.equal(r.vehicles.length, 1);
});

test('parse: מדלג על ביקור בלי LineRef / בלי זמן הגעה / מיקום 0,0', () => {
  const noLine = visit('', 'V2');
  const noTime = visit('7', 'V3').replace(/<ExpectedArrivalTime>.*?<\/ExpectedArrivalTime>/, '');
  const zero = visit('8', 'V4').replace('<Longitude>34.78</Longitude><Latitude>32.08</Latitude>', '<Longitude>0</Longitude><Latitude>0</Latitude>');
  const r = svc.parse(doc(noLine + noTime + zero), stop, resolve);
  assert.deepEqual(r.tripUpdates.map((t) => t.routeId), ['8']);
  assert.equal(r.vehicles.length, 0);
});

test('parse: XML ריק / בלי deliveries לא זורק', () => {
  assert.deepEqual(svc.parse('<Siri/>', stop, resolve), { vehicles: [], tripUpdates: [] });
});
