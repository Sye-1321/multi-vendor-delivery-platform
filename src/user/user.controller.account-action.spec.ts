import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { TYPES } from 'src/application/constants/types';
import { validatePipeInstance } from 'src/infrastructure/utilities/validation-pipe-instance';
import { AccessAuthGuard } from 'src/infrastructure/guards/access-auth.guard';
import { RefreshAuthGuard } from 'src/infrastructure/guards/refresh-auth.guard';
import { RoleGuard } from 'src/infrastructure/guards/role-guard';
import { UserController } from './user.controller';

describe('UserController account-action transport', () => {
  let app: INestApplication;
  const userService = {
    verifyEmail: jest.fn(),
    verifyNewEmail: jest.fn(),
    confirmPasswordReset: jest.fn(),
    completeAdminRegistration: jest.fn(),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        { provide: TYPES.IAuthService, useValue: {} },
        { provide: TYPES.IUserService, useValue: userService },
      ],
    })
      .overrideGuard(AccessAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RefreshAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RoleGuard)
      .useValue({ canActivate: () => true })
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(validatePipeInstance);
    await app.init();
  });

  beforeEach(() => jest.clearAllMocks());
  afterAll(async () => app.close());

  it.each([
    ['/auth/email-verification', 'verifyEmail'],
    ['/users/new-email-verification', 'verifyNewEmail'],
  ] as const)('POST %s passes its body token to %s', async (path, method) => {
    userService[method].mockResolvedValue({ isSuccess: true });

    await request(app.getHttpServer())
      .post(path)
      .send({ token: 'signed-account-action-token' })
      .expect(200);

    expect(userService[method]).toHaveBeenCalledWith(
      'signed-account-action-token',
    );
  });

  it.each([
    ['/auth/password-reset/confirm', 'confirmPasswordReset'],
    ['/auth/registration-completion', 'completeAdminRegistration'],
  ] as const)(
    'POST %s passes token and validated password data to %s',
    async (path, method) => {
      userService[method].mockResolvedValue({ isSuccess: true });
      const passwordData = {
        newPassword: 'Changed1!',
        confirmPassword: 'Changed1!',
      };

      await request(app.getHttpServer())
        .post(path)
        .send({ token: 'signed-account-action-token', ...passwordData })
        .expect(200);

      expect(userService[method]).toHaveBeenCalledWith(
        'signed-account-action-token',
        passwordData,
      );
    },
  );

  it.each([
    ['/auth/email-verification', 'verifyEmail'],
    ['/users/new-email-verification', 'verifyNewEmail'],
  ] as const)(
    'rejects an absent token before invoking %s',
    async (path, method) => {
      await request(app.getHttpServer()).post(path).send({}).expect(400);
      expect(userService[method]).not.toHaveBeenCalled();
    },
  );

  it('preserves inherited password validation', async () => {
    await request(app.getHttpServer())
      .post('/auth/password-reset/confirm')
      .send({
        token: 'signed-account-action-token',
        newPassword: 'weak',
        confirmPassword: 'different',
      })
      .expect(400);
    expect(userService.confirmPasswordReset).not.toHaveBeenCalled();
  });

  it.each([
    ['GET', '/auth/email-verification/old-secret', 'verifyEmail'],
    ['GET', '/users/new-email-verification/old-secret', 'verifyNewEmail'],
    ['POST', '/auth/password-reset/confirm/old-secret', 'confirmPasswordReset'],
    [
      'POST',
      '/auth/registration-completion/old-secret',
      'completeAdminRegistration',
    ],
  ] as const)(
    'does not expose the historical %s route %s',
    async (method, path, serviceMethod) => {
      const server = request(app.getHttpServer());
      const response =
        method === 'GET' ? server.get(path) : server.post(path).send({});
      await response.expect(404);
      expect(userService[serviceMethod]).not.toHaveBeenCalled();
    },
  );
});
