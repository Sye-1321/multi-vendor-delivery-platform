import { ArgumentsHost, BadRequestException } from '@nestjs/common';
import { ApplicationExceptionsFilter } from './exception.filter';

describe('ApplicationExceptionsFilter', () => {
  it('redacts a historical URL credential from logs and response paths', () => {
    const secret = 'eyJhbGciOiJIUzI1NiJ9.payload.signature';
    const warn = jest.fn();
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const filter = new ApplicationExceptionsFilter({
      warn,
      error: jest.fn(),
    } as never);
    const host = {
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'GET',
          originalUrl: `/auth/password-reset/confirm/${secret}`,
        }),
        getResponse: () => ({ status }),
      }),
    } as ArgumentsHost;

    filter.catch(new BadRequestException('Rejected'), host);

    expect(warn).toHaveBeenCalledWith('http.request.rejected', {
      method: 'GET',
      path: '/auth/password-reset/confirm/[REDACTED]',
      statusCode: 400,
    });
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/auth/password-reset/confirm/[REDACTED]',
      }),
    );
    expect(JSON.stringify([warn.mock.calls, json.mock.calls])).not.toContain(
      secret,
    );
  });
});
