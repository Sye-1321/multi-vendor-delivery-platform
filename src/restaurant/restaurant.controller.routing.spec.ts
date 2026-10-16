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
    createRestaurant: jest.fn(),
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

  it('routes POST /companies/me/restaurants to restaurant creation', async () => {
    const restaurantData = {
      name: 'Test Restaurant',
      savedAddress: { city: 'Addis Ababa', subCity: 'Bole' },
      phoneNumber: '251911111111',
      openingHours: '08:00',
      closingHours: '22:00',
      description: 'Test description',
      deliveryPersonAvailability: true,
      restaurantAdminData: {
        name: 'Test Admin',
        email: 'admin@example.com',
        phoneNumber: '251922222222',
        savedAddress: { city: 'Addis Ababa', subCity: 'Bole' },
      },
    };
    restaurantService.createRestaurant.mockResolvedValue(Result.ok({}));

    await request(app.getHttpServer())
      .post('/companies/me/restaurants')
      .field('name', restaurantData.name)
      .field('savedAddress', JSON.stringify(restaurantData.savedAddress))
      .field('phoneNumber', restaurantData.phoneNumber)
      .field('openingHours', restaurantData.openingHours)
      .field('closingHours', restaurantData.closingHours)
      .field('description', restaurantData.description)
      .field(
        'deliveryPersonAvailability',
        String(restaurantData.deliveryPersonAvailability),
      )
      .field(
        'restaurantAdminData',
        JSON.stringify(restaurantData.restaurantAdminData),
      )
      .attach('logo', Buffer.from('logo'), {
        filename: 'logo.png',
        contentType: 'image/png',
      })
      .attach('image', Buffer.from('image'), {
        filename: 'image.png',
        contentType: 'image/png',
      })
      .expect(201);

    expect(restaurantService.createRestaurant).toHaveBeenCalledTimes(1);
    expect(restaurantService.createRestaurant).toHaveBeenCalledWith(
      restaurantData,
      expect.objectContaining({ fieldname: 'logo', originalname: 'logo.png' }),
      expect.objectContaining({
        fieldname: 'image',
        originalname: 'image.png',
      }),
    );
  });

  it('does not register the replaced company restaurant path', async () => {
    await request(app.getHttpServer()).post('/company/restaurants').expect(404);
    expect(restaurantService.createRestaurant).not.toHaveBeenCalled();
  });

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
