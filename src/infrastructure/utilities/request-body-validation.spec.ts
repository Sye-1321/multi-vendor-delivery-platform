import {
  Body,
  Controller,
  INestApplication,
  Patch,
  Post,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { CreateCompanyDTO } from 'src/company/dtos/company.dto';
import { CreateDeliveryPersonDTO } from 'src/delivery-person/dtos/delivery-person.dto';
import {
  CreateMenuItemDTO,
  UpdateMenuItemDTO,
} from 'src/menu-item/dtos/create-menu-item.dto';
import { CancelOrderDTO } from 'src/order/dtos/cancel-order.dto';
import { CreateOrderDTO } from 'src/order/dtos/order.dto';
import { CreateRestaurantDTO } from 'src/restaurant/dtos/create-restaurant.dto';
import { CreateUserDTO } from 'src/user/dtos/user/create-user.dto';
import { UpdateUserProfileDTO } from 'src/user/dtos/user/update-profile.dto';
import { AdminUpdateUserDTO } from 'src/user/dtos/user/admin-update-user.dto';
import { Role } from 'src/application/constants/constants';
import { UserStatus } from 'src/user/constants/constants';
import { validatePipeInstance } from './validation-pipe-instance';

@Controller('validation')
class RequestBodyValidationController {
  @Post('menu-items')
  createMenuItem(@Body() body: CreateMenuItemDTO) {
    return body;
  }

  @Patch('menu-items')
  updateMenuItem(@Body() body: UpdateMenuItemDTO) {
    return body;
  }

  @Post('companies')
  createCompany(@Body() body: CreateCompanyDTO) {
    return body;
  }

  @Post('restaurants')
  createRestaurant(@Body() body: CreateRestaurantDTO) {
    return body;
  }

  @Post('delivery-people')
  createDeliveryPerson(@Body() body: CreateDeliveryPersonDTO) {
    return body;
  }

  @Post('users')
  createUser(@Body() body: CreateUserDTO) {
    return body;
  }

  @Patch('users')
  updateUser(@Body() body: UpdateUserProfileDTO) {
    return body;
  }

  @Patch('admin/users')
  adminUpdateUser(@Body() body: AdminUpdateUserDTO) {
    return body;
  }

  @Post('orders/cancel')
  cancelOrder(@Body() body: CancelOrderDTO) {
    return body;
  }

  @Post('orders')
  createOrder(@Body() body: CreateOrderDTO) {
    return body;
  }
}

describe('Request body validation', () => {
  let app: INestApplication;

  const address = { city: 'Addis Ababa', subCity: 'Bole' };
  const administrator = {
    name: 'Administrator',
    email: 'administrator@example.com',
    phoneNumber: '251911111111',
    savedAddress: address,
  };
  const company = {
    name: 'Company',
    phoneNumber: '251922222222',
    savedAddress: address,
    companyAdminData: administrator,
  };
  const restaurant = {
    name: 'Restaurant',
    phoneNumber: '251933333333',
    savedAddress: address,
    openingHours: '08:00',
    closingHours: '22:00',
    deliveryPersonAvailability: true,
    restaurantAdminData: administrator,
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [RequestBodyValidationController],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(validatePipeInstance);
    await app.init();
  });

  afterAll(async () => app.close());

  it('enforces non-negative menu-item prices with at most two decimals', async () => {
    await request(app.getHttpServer())
      .post('/validation/menu-items')
      .send({ name: 'Item', price: -1, availability: true })
      .expect(400);
    await request(app.getHttpServer())
      .patch('/validation/menu-items')
      .send({ price: -1 })
      .expect(400);
    await request(app.getHttpServer())
      .post('/validation/menu-items')
      .send({ name: 'Item', price: 0, availability: true })
      .expect(201);
    await request(app.getHttpServer())
      .post('/validation/menu-items')
      .send({ name: 'Item', price: 10.99, availability: true })
      .expect(201);
    await request(app.getHttpServer())
      .post('/validation/menu-items')
      .send({ name: 'Item', price: 10.999, availability: true })
      .expect(400);
    await request(app.getHttpServer())
      .patch('/validation/menu-items')
      .send({ price: 10.999 })
      .expect(400);
  });

  it('rejects missing required nested create inputs', async () => {
    const cases = [
      ['/validation/companies', { ...company, companyAdminData: undefined }],
      ['/validation/companies', { ...company, savedAddress: undefined }],
      [
        '/validation/restaurants',
        { ...restaurant, restaurantAdminData: undefined },
      ],
      ['/validation/restaurants', { ...restaurant, savedAddress: undefined }],
      [
        '/validation/delivery-people',
        { name: 'Courier', phoneNumber: '251944444444' },
      ],
    ] as const;

    for (const [path, body] of cases) {
      await request(app.getHttpServer()).post(path).send(body).expect(400);
    }
  });

  it('validates optional user addresses when supplied', async () => {
    const registration = {
      name: 'Customer',
      email: 'customer@example.com',
      phoneNumber: '251955555555',
      password: 'Strong1!',
    };

    await request(app.getHttpServer())
      .post('/validation/users')
      .send({ ...registration, savedAddress: {} })
      .expect(400);
    await request(app.getHttpServer())
      .patch('/validation/users')
      .send({ savedAddress: { city: '', subCity: 'Bole' } })
      .expect(400);
    await request(app.getHttpServer())
      .post('/validation/users')
      .send({ ...registration, savedAddress: { city: 123, subCity: 'Bole' } })
      .expect(400);
    await request(app.getHttpServer())
      .post('/validation/users')
      .send({ ...registration, savedAddress: address })
      .expect(201);
    await request(app.getHttpServer())
      .patch('/validation/users')
      .send({ savedAddress: address })
      .expect(200);
  });

  it('uses the registration phone format for profile updates', async () => {
    await request(app.getHttpServer())
      .patch('/validation/users')
      .send({ phoneNumber: '251911111111' })
      .expect(200);
    await request(app.getHttpServer())
      .patch('/validation/users')
      .send({ phoneNumber: '+251911111111' })
      .expect(400);
  });

  it('validates administrator role and status updates', async () => {
    for (const body of [
      { role: Role.BUSINESS_ADMINISTRATOR },
      { status: UserStatus.SUSPENDED },
    ]) {
      await request(app.getHttpServer())
        .patch('/validation/admin/users')
        .send(body)
        .expect(200);
    }

    for (const body of [
      { role: 'NOT_A_ROLE' },
      { status: 'NOT_A_STATUS' },
      { roles: Role.END_USER },
    ]) {
      await request(app.getHttpServer())
        .patch('/validation/admin/users')
        .send(body)
        .expect(400);
    }
  });

  it('trims cancellation reasons before validating their length', async () => {
    await request(app.getHttpServer())
      .post('/validation/orders/cancel')
      .send({ reason: '   ' })
      .expect(400);
    await request(app.getHttpServer())
      .post('/validation/orders/cancel')
      .send({ reason: ' ab ' })
      .expect(400);
    await request(app.getHttpServer())
      .post('/validation/orders/cancel')
      .send({ reason: '  changed my mind  ' })
      .expect(201)
      .expect({ reason: 'changed my mind' });
  });

  it('enforces checkout quantity bounds', async () => {
    for (const [quantity, status] of [
      [0, 400],
      [100, 201],
      [101, 400],
    ]) {
      await request(app.getHttpServer())
        .post('/validation/orders')
        .send({
          cart: {
            cartItems: [{ menuItemId: '507f1f77bcf86cd799439011', quantity }],
          },
          deliveryAddress: address,
        })
        .expect(status);
    }
  });

  it('accepts restaurant creation without a description', async () => {
    await request(app.getHttpServer())
      .post('/validation/restaurants')
      .send(restaurant)
      .expect(201);
  });
});
