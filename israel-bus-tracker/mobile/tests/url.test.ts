import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { DEV_DEFAULT_API, isCleartext, isHttpUrl, resolveApiConfig } from '../src/lib/url';

describe('resolveApiConfig - פיתוח', () => {
  it('בלי משתנים: ברירת מחדל localhost', () => {
    const c = resolveApiConfig({ api: undefined, socket: undefined, isDev: true });
    assert.equal(c.apiBase, DEV_DEFAULT_API);
    assert.equal(c.socketUrl, DEV_DEFAULT_API);
    assert.equal(c.configured, true);
  });

  it('משתנה ריק (CI) נחשב כלא מוגדר', () => {
    assert.equal(resolveApiConfig({ api: '', socket: '', isDev: true }).apiBase, DEV_DEFAULT_API);
  });

  it('http מותר בפיתוח (LAN)', () => {
    const c = resolveApiConfig({ api: 'http://192.168.1.20:4000/', socket: undefined, isDev: true });
    assert.equal(c.configured, true);
    assert.equal(c.apiBase, 'http://192.168.1.20:4000');
  });
});

describe('resolveApiConfig - release', () => {
  it('בלי כתובת: לא מוגדר, בלי ברירת מחדל ל-localhost', () => {
    const c = resolveApiConfig({ api: undefined, socket: undefined, isDev: false });
    assert.equal(c.configured, false);
    assert.equal(c.problem, 'missing');
    assert.equal(c.apiBase, '');
    assert.equal(c.socketUrl, '');
  });

  it('כתובת רווחים בלבד = חסרה', () => {
    assert.equal(resolveApiConfig({ api: '   ', socket: undefined, isDev: false }).problem, 'missing');
  });

  it('https תקין: מוגדר, ללא סלאש סופי, socket יורש מה-API', () => {
    const c = resolveApiConfig({ api: ' https://api.example.com/// ', socket: undefined, isDev: false });
    assert.equal(c.configured, true);
    assert.equal(c.apiBase, 'https://api.example.com');
    assert.equal(c.socketUrl, 'https://api.example.com');
  });

  it('socket נפרד', () => {
    const c = resolveApiConfig({ api: 'https://api.example.com', socket: 'https://ws.example.com', isDev: false });
    assert.equal(c.socketUrl, 'https://ws.example.com');
  });

  it('http (cleartext) נחסם ב-release, גם ל-localhost', () => {
    for (const api of ['http://api.example.com', 'http://localhost:4000']) {
      const c = resolveApiConfig({ api, socket: undefined, isDev: false });
      assert.equal(c.configured, false);
      assert.equal(c.problem, 'cleartext');
      assert.equal(c.apiBase, '');
    }
  });

  it('socket ב-http נחסם גם כש-API ב-https', () => {
    const c = resolveApiConfig({ api: 'https://api.example.com', socket: 'http://ws.example.com', isDev: false });
    assert.equal(c.problem, 'cleartext');
    assert.equal(c.configured, false);
  });

  it('כתובות לא תקינות', () => {
    for (const api of ['api.example.com', 'ftp://x.com', 'https://', 'https://a b.com', 'javascript:alert(1)', 'https://user@evil.com']) {
      assert.equal(resolveApiConfig({ api, socket: undefined, isDev: false }).problem, 'invalid', api);
    }
  });
});

describe('isHttpUrl / isCleartext', () => {
  it('זיהוי', () => {
    assert.equal(isHttpUrl('https://a.co'), true);
    assert.equal(isHttpUrl('https://a.co:8443/base'), true);
    assert.equal(isHttpUrl('a.co'), false);
    assert.equal(isCleartext('HTTP://a.co'), true);
    assert.equal(isCleartext('https://a.co'), false);
  });
});
