import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
import { ROLE_KEY, Role } from './application/constants/constants';
import { CompanyController } from './company/company.controller';
import { DeliveryPersonController } from './delivery-person/delivery-person.controller';
import { AccessAuthGuard } from './infrastructure/guards/access-auth.guard';
import { RoleGuard } from './infrastructure/guards/role-guard';
import { MenuItemController } from './menu-item/menu-item.controller';
import { MenuController } from './menu/menu.controller';
import { OrderController } from './order/order.controller';
import { RestaurantReviewController } from './restaurant-review/restaurant-review.controller';
import { RestaurantController } from './restaurant/restaurant.controller';
import { SystemReviewController } from './system-review/system-review.controller';
import { UserController } from './user/user.controller';

type ControllerType = { prototype: object };

const route = (
  controller: ControllerType,
  handler: string,
): { path: string; method: RequestMethod } => {
  const target = (controller.prototype as Record<string, object>)[handler];
  return {
    path: Reflect.getMetadata(PATH_METADATA, target) as string,
    method: Reflect.getMetadata(METHOD_METADATA, target) as RequestMethod,
  };
};

describe('normalized controller route contract', () => {
  it.each([
    [OrderController, '/'],
    [DeliveryPersonController, '/'],
    [RestaurantReviewController, '/'],
    [SystemReviewController, 'system-reviews'],
  ])('uses the expected prefix on %s', (controller, path) => {
    expect(Reflect.getMetadata(PATH_METADATA, controller)).toBe(path);
  });

  it.each([
    [
      UserController,
      'verifyEmail',
      '/auth/email-verification/confirm',
      RequestMethod.POST,
    ],
    [UserController, 'refreshToken', '/auth/refresh', RequestMethod.POST],
    [
      UserController,
      'verifyNewEmail',
      '/auth/email-change/confirm',
      RequestMethod.POST,
    ],
    [
      UserController,
      'completeAdminRegistration',
      '/auth/registration-completion/confirm',
      RequestMethod.POST,
    ],
    [
      UserController,
      'createCompanyAdmin',
      '/admin/users/business-administrators',
      RequestMethod.POST,
    ],
    [
      UserController,
      'createRestaurantAdmin',
      '/admin/users/restaurant-administrators',
      RequestMethod.POST,
    ],
    [UserController, 'updateUser', '/admin/users/:userId', RequestMethod.PATCH],
    [
      CompanyController,
      'changeCompanyAdmin',
      ':companyId/administrator',
      RequestMethod.PUT,
    ],
    [
      RestaurantController,
      'getRestaurantById',
      'restaurants/:restaurantId',
      RequestMethod.GET,
    ],
    [
      RestaurantController,
      'getRestaurantsByCompany',
      'companies/me/restaurants',
      RequestMethod.GET,
    ],
    [
      RestaurantController,
      'getCompanyRestaurantById',
      'companies/me/restaurants/:restaurantId',
      RequestMethod.GET,
    ],
    [
      RestaurantController,
      'changeRestaurantAdmin',
      'companies/me/restaurants/:restaurantId/administrator',
      RequestMethod.PUT,
    ],
    [
      RestaurantController,
      'createRestaurant',
      'companies/me/restaurants',
      RequestMethod.POST,
    ],
    [MenuController, 'createMenu', 'restaurants/me/menus', RequestMethod.POST],
    [MenuController, 'getMyMenus', 'restaurants/me/menus', RequestMethod.GET],
    [
      MenuController,
      'updateMenu',
      'restaurants/me/menus/:menuId',
      RequestMethod.PUT,
    ],
    [
      MenuController,
      'deleteMenu',
      'restaurants/me/menus/:menuId',
      RequestMethod.DELETE,
    ],
    [
      MenuController,
      'getRestaurantMenus',
      'restaurants/:restaurantId/menus',
      RequestMethod.GET,
    ],
    [
      MenuController,
      'getMenuById',
      'restaurants/:restaurantId/menus/:menuId',
      RequestMethod.GET,
    ],
    [
      MenuItemController,
      'createItem',
      'restaurants/me/menu-items',
      RequestMethod.POST,
    ],
    [
      MenuItemController,
      'getItems',
      'restaurants/me/menu-items',
      RequestMethod.GET,
    ],
    [
      MenuItemController,
      'getItemById',
      'restaurants/me/menu-items/:menuItemId',
      RequestMethod.GET,
    ],
    [
      MenuItemController,
      'updateItem',
      'restaurants/me/menu-items/:menuItemId',
      RequestMethod.PUT,
    ],
    [
      MenuItemController,
      'deleteItem',
      'restaurants/me/menu-items/:menuItemId',
      RequestMethod.DELETE,
    ],
    [
      MenuItemController,
      'getRestaurantItems',
      'restaurants/:restaurantId/menu-items',
      RequestMethod.GET,
    ],
    [
      MenuItemController,
      'getRestaurantItemById',
      'restaurants/:restaurantId/menu-items/:menuItemId',
      RequestMethod.GET,
    ],
    [
      OrderController,
      'createOrder',
      'restaurants/:restaurantId/orders',
      RequestMethod.POST,
    ],
    [OrderController, 'getOrdersByUser', 'users/me/orders', RequestMethod.GET],
    [
      OrderController,
      'getRestaurantOrders',
      'restaurants/me/orders',
      RequestMethod.GET,
    ],
    [
      OrderController,
      'getRestaurantOrderById',
      'restaurants/me/orders/:orderId',
      RequestMethod.GET,
    ],
    [OrderController, 'getAllOrders', 'orders', RequestMethod.GET],
    [
      OrderController,
      'assignDeliveryPerson',
      'orders/:orderId/delivery-person/:deliveryPersonId',
      RequestMethod.PATCH,
    ],
    [
      DeliveryPersonController,
      'createSystemWideDeliveryPerson',
      'delivery-persons',
      RequestMethod.POST,
    ],
    [
      DeliveryPersonController,
      'getSystemWideDeliveryPersons',
      'delivery-persons',
      RequestMethod.GET,
    ],
    [
      DeliveryPersonController,
      'getSystemWideDeliveryPersonById',
      'delivery-persons/:deliveryPersonId',
      RequestMethod.GET,
    ],
    [
      DeliveryPersonController,
      'updateSystemWideDeliveryPerson',
      'delivery-persons/:deliveryPersonId',
      RequestMethod.PATCH,
    ],
    [
      DeliveryPersonController,
      'createRestaurantDeliveryPerson',
      'restaurants/me/delivery-persons',
      RequestMethod.POST,
    ],
    [
      DeliveryPersonController,
      'getDeliveryPersonsByRestaurantId',
      'restaurants/me/delivery-persons',
      RequestMethod.GET,
    ],
    [
      DeliveryPersonController,
      'getRestaurantDeliveryPersonById',
      'restaurants/me/delivery-persons/:deliveryPersonId',
      RequestMethod.GET,
    ],
    [
      DeliveryPersonController,
      'updateRestaurantDeliveryPerson',
      'restaurants/me/delivery-persons/:deliveryPersonId',
      RequestMethod.PATCH,
    ],
    [
      RestaurantReviewController,
      'createReview',
      'restaurants/:restaurantId/reviews',
      RequestMethod.POST,
    ],
    [
      RestaurantReviewController,
      'updateReview',
      'restaurant-reviews/:reviewId',
      RequestMethod.PATCH,
    ],
    [SystemReviewController, 'createReview', '/', RequestMethod.POST],
    [SystemReviewController, 'getAllReviews', '/', RequestMethod.GET],
    [SystemReviewController, 'updateReview', ':reviewId', RequestMethod.PATCH],
    [SystemReviewController, 'deleteReview', ':reviewId', RequestMethod.DELETE],
  ] as const)('%s.%s uses %s', (controller, handler, path, method) => {
    expect(route(controller, handler)).toEqual({ path, method });
  });

  it.each([
    [OrderController, 'getAllOrders', [Role.DELIVERY_COMPANY_ADMINISTRATOR]],
    [OrderController, 'createOrder', [Role.END_USER]],
    [
      RestaurantController,
      'getRestaurantsByCompany',
      [Role.BUSINESS_ADMINISTRATOR],
    ],
    [
      DeliveryPersonController,
      'getSystemWideDeliveryPersons',
      [Role.DELIVERY_COMPANY_ADMINISTRATOR],
    ],
    [
      DeliveryPersonController,
      'getDeliveryPersonsByRestaurantId',
      [Role.RESTAURANT_ADMINISTRATOR],
    ],
  ] as const)(
    'preserves guards and roles on %s.%s',
    (controller, handler, roles) => {
      const target = (
        controller.prototype as unknown as Record<string, object>
      )[handler];
      expect(Reflect.getMetadata(GUARDS_METADATA, target)).toEqual([
        AccessAuthGuard,
        RoleGuard,
      ]);
      expect(Reflect.getMetadata(ROLE_KEY, target)).toEqual(roles);
    },
  );
});
