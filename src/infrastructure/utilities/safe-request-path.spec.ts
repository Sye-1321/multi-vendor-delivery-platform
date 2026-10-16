import { Request } from 'express';
import { getSafeRequestPath } from './safe-request-path';

describe('getSafeRequestPath', () => {
  const secret = 'eyJhbGciOiJIUzI1NiJ9.payload.signature';

  it('uses a matched route template instead of parameter values', () => {
    const request = {
      baseUrl: '/api/v1',
      originalUrl: '/admin/users/68db123?verbose=true',
      route: { path: '/admin/users/:id' },
    } as Request;

    expect(getSafeRequestPath(request)).toBe('/api/v1/admin/users/:id');
  });

  it('does not expose tokens in unmatched historical account-action URLs', () => {
    const safePath = getSafeRequestPath({
      originalUrl: `/api/v1/auth/email-verification/${secret}`,
    } as Request);

    expect(safePath).toBe('/[unmatched]');
    expect(safePath).not.toContain(secret);
  });

  it('does not expose tokens in unmatched current confirmation URLs', () => {
    const safePath = getSafeRequestPath({
      originalUrl: `/api/v1/auth/email-verification/confirm/${secret}`,
    } as Request);

    expect(safePath).toBe('/[unmatched]');
    expect(safePath).not.toContain(secret);
  });

  it('does not expose arbitrary unmatched path segments or query values', () => {
    const safePath = getSafeRequestPath({
      originalUrl: `/private/customer/${secret}?token=${secret}&page=1`,
    } as Request);

    expect(safePath).toBe('/[unmatched]');
    expect(safePath).not.toContain('private');
    expect(safePath).not.toContain(secret);
    expect(safePath).not.toContain('page=1');
  });
});
