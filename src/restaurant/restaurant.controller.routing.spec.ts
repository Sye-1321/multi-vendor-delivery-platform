import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { TYPES } from 'src/application/constants/types';
import { Result } from 'src/domain/result/result';
import { AccessAuthGuard } from 'src/infrastructure/guards/access-auth.guard';
import { RoleGuard } from 'src/infrastructure/guards/role-guard';
import { RestaurantController } from './restaurant.controller';
import { Types } from 'mongoose';

describe('RestaurantController routing', () => {
  let app: INestApplication;
  const restaurantService = {
    getRestaurantById: jest.fn(),
    getRestaurantByRestaurantAdmin: jest.fn(),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [RestaurantController],
      providers: [
        {
          provide: TYPES.IRestaurantService,
          useValue: restaurantService,
        },
      ],
    })
      .overrideGuard(AccessAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RoleGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = module.createNestApplication();
    await app.init();
  });

  beforeEach(() => jest.clearAllMocks());
  afterAll(async () => app.close());

  it('routes GET /restaurants/me to the current restaurant administrator', async () => {
    restaurantService.getRestaurantByRestaurantAdmin.mockResolvedValue(
      Result.ok({}),
    );

    await request(app.getHttpServer()).get('/restaurants/me').expect(200);

    expect(restaurantService.getRestaurantById).not.toHaveBeenCalled();
    expect(
      restaurantService.getRestaurantByRestaurantAdmin,
    ).toHaveBeenCalledTimes(1);
  });

  it('routes GET /restaurants/:id to the requested restaurant', async () => {
    const restaurantId = '507f1f77bcf86cd799439011';
    restaurantService.getRestaurantById.mockResolvedValue(Result.ok({}));

    await request(app.getHttpServer())
      .get(`/restaurants/${restaurantId}`)
      .expect(200);

    expect(restaurantService.getRestaurantById).toHaveBeenCalledTimes(1);
    const [receivedRestaurantId] =
      restaurantService.getRestaurantById.mock.calls[0];
    expect(receivedRestaurantId).toBeInstanceOf(Types.ObjectId);
    expect(receivedRestaurantId.toString()).toBe(restaurantId);
    expect(
      restaurantService.getRestaurantByRestaurantAdmin,
    ).not.toHaveBeenCalled();
  });

  it('rejects a malformed restaurant id before calling the service', async () => {
    await request(app.getHttpServer())
      .get('/restaurants/not-an-id')
      .expect(400);

    expect(restaurantService.getRestaurantById).not.toHaveBeenCalled();
    expect(
      restaurantService.getRestaurantByRestaurantAdmin,
    ).not.toHaveBeenCalled();
  });
});
