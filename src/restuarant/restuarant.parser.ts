import { CompanyParser } from 'src/company/company.parser';
import { IRestaurantResponse } from './interfaces/restuarant-response.interface';
import { Restaurant } from './restuarant';
import { UserParser } from 'src/user/user.parser';
import { AuditParser } from 'src/audit/audit.parser';
import { MenuParser } from 'src/menu/menu.parser';
import { RestaurantReviewParser } from 'src/restuarant-review/restaurant-review.parser';

export class RestaurantParser {
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
      reviews: reviews.map((review) => RestaurantReviewParser.createReviewResponse(review)),
      menus: menus.map((menu) => MenuParser.createMenuResponse(menu)),
      ...AuditParser.createAuditResponse(audit),
    };

    return response;
  }

  static createRestaurantsResponse(restaurants: Restaurant[]): IRestaurantResponse[] {
    return restaurants.map((restaurant) => this.createRestaurantResponse(restaurant));
  }
}
