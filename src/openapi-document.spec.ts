import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { CompanyController } from './company/company.controller';
import { DeliveryPersonController } from './delivery-person/delivery-person.controller';
import { HealthController } from './health/health.controller';
import { MenuController } from './menu/menu.controller';
import { MenuItemController } from './menu-item/menu-item.controller';
import { NotificationController } from './notifications/notification.controller';
import { OrderController } from './order/order.controller';
import { RestaurantController } from './restaurant/restaurant.controller';
import { RestaurantReviewController } from './restaurant-review/restaurant-review.controller';
import { SystemReviewController } from './system-review/system-review.controller';
import { UserController } from './user/user.controller';

type ResultResponseDocument = {
  content?: {
    'application/json'?: {
      schema?: {
        properties?: Record<string, { $ref?: string }>;
      };
    };
  };
};

describe('OpenAPI document', () => {
  let app: INestApplication;
  let document: OpenAPIObject;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [
        CompanyController,
        DeliveryPersonController,
        HealthController,
        MenuController,
        MenuItemController,
        NotificationController,
        OrderController,
        RestaurantController,
        RestaurantReviewController,
        SystemReviewController,
        UserController,
      ],
    })
      .useMocker(() => ({}))
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
    document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('Multi-Vendor Delivery Platform')
        .setVersion('v1')
        .addBearerAuth(undefined, 'access-token')
        .addBearerAuth(undefined, 'refresh-token')
        .build(),
    );
  });

  afterAll(async () => app.close());

  it('generates the normalized route contract without legacy paths', () => {
    const httpMethods = new Set([
      'get',
      'post',
      'put',
      'patch',
      'delete',
      'options',
      'head',
    ]);
    const operationCount = Object.values(document.paths).reduce(
      (total, path) =>
        total + Object.keys(path).filter((key) => httpMethods.has(key)).length,
      0,
    );
    const operations = Object.values(document.paths).flatMap((path) =>
      Object.entries(path)
        .filter(([method]) => httpMethods.has(method))
        .map(([, operation]) => operation as { summary?: string }),
    );
    expect(Object.keys(document.paths)).toHaveLength(60);
    expect(operationCount).toBe(77);
    expect(operations).toHaveLength(77);
    expect(
      operations.every((operation) => Boolean(operation.summary?.trim())),
    ).toBe(true);
    expect(
      document.paths['/api/v1/restaurants/{restaurantId}/orders']?.post,
    ).toBeDefined();
    expect(document.paths['/api/v1/users/me/orders']?.get).toBeDefined();
    expect(document.paths['/api/v1/restaurants/me/orders']?.get).toBeDefined();
    expect(
      document.paths['/api/v1/companies/me/restaurants']?.get,
    ).toBeDefined();
    expect(document.paths['/api/v1/delivery-persons']?.get).toBeDefined();
    expect(document.paths['/api/v1/system-reviews']?.get).toBeDefined();
    expect(document.paths['/api/v1/orders/{restaurantId}']).toBeUndefined();
    expect(document.paths['/api/v1/auth/token/refresh']).toBeUndefined();
  });

  it('documents checkout input, access authentication, and idempotency', () => {
    const operation =
      document.paths['/api/v1/restaurants/{restaurantId}/orders'].post!;
    expect(operation.summary).toBe('Create an order for a restaurant');
    expect(operation.security).toEqual([{ 'access-token': [] }]);
    expect(operation.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          in: 'header',
          name: 'Idempotency-Key',
          required: true,
        }),
        expect.objectContaining({
          in: 'path',
          name: 'restaurantId',
          required: true,
        }),
      ]),
    );
    const idempotencyHeader = (
      operation.parameters as Array<{
        in?: string;
        name?: string;
        schema?: { minLength?: number; maxLength?: number };
      }>
    ).find((parameter) => parameter.name === 'Idempotency-Key');
    expect(idempotencyHeader?.schema).toEqual(
      expect.objectContaining({ minLength: 1, maxLength: 128 }),
    );
    const body = operation.requestBody as {
      content: Record<string, { schema: { $ref: string } }>;
    };
    expect(body.content['application/json'].schema.$ref).toContain(
      'CreateOrderDTO',
    );
    const cartItemSchema = document.components?.schemas?.CreateCartItemDTO as {
      required?: string[];
    };
    expect(cartItemSchema.required).toEqual(
      expect.arrayContaining(['menuItemId', 'quantity']) as string[],
    );
  });

  it('uses the actual audit fields in detailed order responses', () => {
    const orderSchema = document.components?.schemas?.OrderSchema as {
      required?: string[];
      properties?: Record<string, unknown>;
    };
    expect(orderSchema.required).toEqual(
      expect.arrayContaining(['auditCreatedBy', 'auditCreatedDateTime']),
    );
    expect(orderSchema.properties).toHaveProperty('auditModifiedBy');
    expect(orderSchema.properties).toHaveProperty('auditDeletedDateTime');
    expect(orderSchema.properties).not.toHaveProperty('createdAt');
    expect(orderSchema.properties).not.toHaveProperty('updatedAt');
  });

  it('documents Result envelopes and concrete token payloads', () => {
    const companyResponse = document.paths['/api/v1/companies']?.get?.responses[
      '200'
    ] as ResultResponseDocument;
    const companyProperties =
      companyResponse.content?.['application/json']?.schema?.properties;
    expect(companyProperties).toHaveProperty('isSuccess');
    expect(companyProperties).toHaveProperty('data');
    expect(companyProperties).toHaveProperty('message');

    const loginSchema = document.paths['/api/v1/auth/login']?.post?.responses[
      '200'
    ] as ResultResponseDocument;
    expect(
      loginSchema.content?.['application/json']?.schema?.properties?.data?.$ref,
    ).toContain('SignedInUserSchema');
    const refreshSchema = document.paths['/api/v1/auth/refresh']?.post
      ?.responses['200'] as ResultResponseDocument;
    expect(
      refreshSchema.content?.['application/json']?.schema?.properties?.data
        ?.$ref,
    ).toContain('TokenPairSchema');
    const tokens = document.components?.schemas?.TokenPairSchema as {
      required?: string[];
      properties?: Record<string, unknown>;
    };
    expect(tokens.required).toEqual(
      expect.arrayContaining(['accessToken', 'refreshToken']),
    );
  });

  it('documents non-order ObjectIds and array item constraints', () => {
    for (const [path, method, name] of [
      ['/api/v1/companies/{companyId}', 'get', 'companyId'],
      ['/api/v1/restaurants/{restaurantId}', 'get', 'restaurantId'],
      ['/api/v1/restaurants/{restaurantId}/menus/{menuId}', 'get', 'menuId'],
      [
        '/api/v1/restaurants/{restaurantId}/menu-items/{menuItemId}',
        'get',
        'menuItemId',
      ],
      ['/api/v1/system-reviews/{reviewId}', 'patch', 'reviewId'],
    ]) {
      const operation = (
        document.paths[path] as Record<
          string,
          { parameters: Array<{ name?: string; schema?: unknown }> }
        >
      )[method];
      const parameter = operation.parameters.find(
        (candidate: { name?: string }) => candidate.name === name,
      );
      expect(parameter?.schema).toEqual(
        expect.objectContaining({
          type: 'string',
          pattern: '^[0-9a-fA-F]{24}$',
        }),
      );
    }
    const menuSchema = document.components?.schemas?.CreateMenuDTO as {
      properties?: { menuItemsIds?: { items?: Record<string, unknown> } };
    };
    expect(menuSchema.properties?.menuItemsIds?.items).toEqual(
      expect.objectContaining({
        type: 'string',
        pattern: '^[0-9a-fA-F]{24}$',
      }),
    );
  });

  it('keeps public operations unsecured and refresh authentication distinct', () => {
    expect(
      document.paths['/api/v1/restaurants']?.get?.security,
    ).toBeUndefined();
    expect(
      document.paths['/api/v1/auth/login']?.post?.security,
    ).toBeUndefined();
    expect(document.paths['/api/v1/auth/refresh']?.post?.security).toEqual([
      { 'refresh-token': [] },
    ]);
    const systemAdminOperation = document.paths[
      '/api/v1/admin/users/business-administrators'
    ]?.post as { 'x-required-roles'?: string[] };
    expect(systemAdminOperation['x-required-roles']).toEqual([
      'SYSTEM_ADMINISTRATOR',
    ]);
    const deliveredOperation = document.paths[
      '/api/v1/orders/{orderId}/delivered'
    ]?.patch as { 'x-required-roles'?: string[] };
    expect(deliveredOperation['x-required-roles']).toEqual([
      'RESTAURANT_ADMINISTRATOR',
      'DELIVERY_COMPANY_ADMINISTRATOR',
    ]);
    expect(
      (
        document.paths['/api/v1/restaurants']?.get as {
          'x-required-roles'?: string[];
        }
      )['x-required-roles'],
    ).toBeUndefined();
  });

  it('documents representative multipart file fields', () => {
    const createRestaurant =
      document.paths['/api/v1/companies/me/restaurants'].post!;
    const requestBody = createRestaurant.requestBody as {
      content: Record<
        string,
        { schema: { properties: Record<string, unknown> } }
      >;
    };
    expect(
      requestBody.content['multipart/form-data'].schema.properties,
    ).toHaveProperty('logo');
    expect(
      requestBody.content['multipart/form-data'].schema.properties,
    ).toHaveProperty('image');
    const deliveryPerson = document.paths['/api/v1/delivery-persons'].post!;
    const deliveryBody = deliveryPerson.requestBody as {
      content: Record<
        string,
        { schema: { properties: Record<string, unknown> } }
      >;
    };
    expect(
      deliveryBody.content['multipart/form-data'].schema.properties,
    ).toHaveProperty('profileImage');
  });

  it('documents direct health responses and no-content operations', () => {
    const health = document.paths['/api/v1/health/live']?.get?.responses[
      '200'
    ] as { content?: { 'application/json'?: { schema?: { $ref?: string } } } };
    expect(health.content?.['application/json']?.schema?.$ref).toContain(
      'HealthResponseSchema',
    );
    for (const response of [
      document.paths['/api/v1/users/me']?.delete?.responses['204'],
      document.paths['/api/v1/restaurants/me/menu-items/{menuItemId}']?.delete
        ?.responses['204'],
    ]) {
      expect(response).toBeDefined();
      expect(response).not.toHaveProperty('content');
    }
  });
});
