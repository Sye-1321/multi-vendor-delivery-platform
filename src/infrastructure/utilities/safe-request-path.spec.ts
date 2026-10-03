import { Request } from 'express';
import { getSafeRequestPath } from './safe-request-path';

describe('getSafeRequestPath', () => {
  const secret = 'eyJhbGciOiJIUzI1NiJ9.payload.signature';

  it('uses a matched route template instead of parameter values', () => {
    const request = {
      baseUrl: '',
      originalUrl: '/admin/users/68db123?verbose=true',
      route: { path: '/admin/users/:id' },
    } as Request;

    expect(getSafeRequestPath(request)).toBe('/admin/users/:id');
  });

  it.each([
    '/auth/email-verification',
    '/users/new-email-verification',
    '/auth/password-reset/confirm',
    '/auth/registration-completion',
  ])('redacts historical credential paths under %s', (prefix) => {
    const safePath = getSafeRequestPath({
      originalUrl: `${prefix}/${secret}`,
    } as Request);

    expect(safePath).toBe(`${prefix}/[REDACTED]`);
    expect(safePath).not.toContain(secret);
  });

  it.each([
    '/auth/email-verification',
    '/users/new-email-verification',
    '/auth/password-reset/confirm',
    '/auth/registration-completion',
  ])('redacts historical credential paths under /api/v1%s', (prefix) => {
    const prefixedRoute = `/api/v1${prefix}`;
    const safePath = getSafeRequestPath({
      originalUrl: `${prefixedRoute}/${secret}`,
    } as Request);

    expect(safePath).toBe(`${prefixedRoute}/[REDACTED]`);
    expect(safePath).not.toContain(secret);
  });

  it('strips all query names and values from unmatched paths', () => {
    const safePath = getSafeRequestPath({
      originalUrl: `/some/path?token=${secret}&page=1`,
    } as Request);

    expect(safePath).toBe('/some/path');
    expect(safePath).not.toContain(secret);
    expect(safePath).not.toContain('page=1');
  });
});
