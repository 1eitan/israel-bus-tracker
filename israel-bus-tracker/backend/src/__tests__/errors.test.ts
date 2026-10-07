import assert from 'node:assert/strict';
import { test } from 'node:test';

import { AppError, errorHandler, notFound, notFoundHandler, toErrorBody } from '../http/errors';

function fakeRes(headersSent = false) {
  const out: { status?: number; body?: unknown } = {};
  const res = {
    headersSent,
    status(code: number) {
      out.status = code;
      return res;
    },
    json(body: unknown) {
      out.body = body;
      return res;
    }
  };
  return { res: res as never, out };
}

test('AppError -> status + צורה אחידה', () => {
  const { res, out } = fakeRes();
  errorHandler(notFound('הקו לא נמצא'), {} as never, res, () => assert.fail('next'));
  assert.equal(out.status, 404);
  assert.deepEqual(out.body, { error: 'הקו לא נמצא', code: 'NOT_FOUND' });
});

test('details נכללים רק כשקיימים', () => {
  assert.deepEqual(toErrorBody(new AppError(400, 'X', 'm', { a: 1 })), { error: 'm', code: 'X', details: { a: 1 } });
});

test('JSON שבור -> 400, גוף גדול -> 413', () => {
  let r = fakeRes();
  errorHandler({ type: 'entity.parse.failed' }, {} as never, r.res, () => assert.fail('next'));
  assert.equal(r.out.status, 400);
  assert.equal((r.out.body as { code: string }).code, 'INVALID_JSON');
  r = fakeRes();
  errorHandler({ type: 'entity.too.large' }, {} as never, r.res, () => assert.fail('next'));
  assert.equal(r.out.status, 413);
});

test('שגיאה לא צפויה -> 500 בלי דליפת פרטים', () => {
  const orig = console.error;
  console.error = () => {};
  try {
    const { res, out } = fakeRes();
    errorHandler(new Error('סוד פנימי'), {} as never, res, () => assert.fail('next'));
    assert.equal(out.status, 500);
    assert.deepEqual(out.body, { error: 'שגיאת שרת פנימית', code: 'INTERNAL_ERROR' });
  } finally {
    console.error = orig;
  }
});

test('headers כבר נשלחו -> מועבר ל-next', () => {
  const { res } = fakeRes(true);
  let called = false;
  errorHandler(new Error('x'), {} as never, res, () => {
    called = true;
  });
  assert.ok(called);
});

test('notFoundHandler', () => {
  const { res, out } = fakeRes();
  notFoundHandler({} as never, res);
  assert.equal(out.status, 404);
  assert.equal((out.body as { code: string }).code, 'ROUTE_NOT_FOUND');
});
