import {
  IPublicRestaurantResponse,
  IRestaurantResponse,
} from './interfaces/restaurant-response.interface';
import { Restaurant } from './restaurant';
import { UserParser } from 'src/user/user.parser';
import { AuditParser } from 'src/audit/audit.parser';
import { MenuParser } from 'src/menu/menu.parser';
import { RestaurantReviewParser } from 'src/restaurant-review/restaurant-review.parser';

export class RestaurantParser {
  static createPublicRestaurantResponse(
    restaurant: Restaurant,
  ): IPublicRestaurantResponse {
    const {
      id,
      name,
      image,
      logo,
      phoneNumber,
      openingHours,
      closingHours,
      status,
      description,
      savedAddress,
      restaurantAdmin,
      deliveryPersonAvailability,
      reviews,
      menus,
      audit,
    } = restaurant;

    return {
      id,
      name,
      description,
      savedAddress,
      phoneNumber,
      restaurantAdmin: UserParser.createPublicUserResponse(restaurantAdmin),
      deliveryPersonAvailability,
      status,
      openingHours,
      closingHours,
      image,
      logo,
      reviews: reviews.map((review) =>
        RestaurantReviewParser.createPublicReviewResponse(review),
      ),
      menus: menus.map((menu) => MenuParser.createMenuResponse(menu)),
      ...AuditParser.createAuditResponse(audit),
    };
  }

  static createPublicRestaurantsResponse(
    restaurants: Restaurant[],
  ): IPublicRestaurantResponse[] {
    return restaurants.map((restaurant) =>
      this.createPublicRestaurantResponse(restaurant),
    );
  }

  static createRestaurantResponse(restaurant: Restaurant): IRestaurantResponse {
    const {
      id,
      name,
      image,
      logo,
      phoneNumber,
      openingHours,
      closingHours,
      status,
      description,
      savedAddress,
      restaurantAdmin,
      deliveryPersonAvailability,
      reviews,
      menus,
      audit,
    } = restaurant;

    const response: IRestaurantResponse = {
      id,
      name,
      description,
      savedAddress,
      phoneNumber,
      restaurantAdmin: UserParser.createUserResponse(restaurantAdmin),
      deliveryPersonAvailability,
      status,
      openingHours,
      closingHours,
      image,
      logo,
      reviews: reviews.map((review) =>
        RestaurantReviewParser.createReviewResponse(review),
      ),
      menus: menus.map((menu) => MenuParser.createMenuResponse(menu)),
      ...AuditParser.createAuditResponse(audit),
    };

    return response;
  }

  static createRestaurantsResponse(
    restaurants: Restaurant[],
  ): IRestaurantResponse[] {
    return restaurants.map((restaurant) =>
      this.createRestaurantResponse(restaurant),
    );
  }
}
