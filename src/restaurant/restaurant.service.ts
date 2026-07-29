import { HttpStatus, Injectable, Inject } from '@nestjs/common';
import { Types, Connection } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { TYPES } from '../application/constants/types';
import { Result } from '../domain/result/result';
import { throwApplicationError } from '../infrastructure/utilities/exception-instance';
import { RestaurantMapper } from './restaurant.mapper';
import { RestaurantParser } from './restaurant.parser';
import { Context } from '../infrastructure/context/context';
import { Restaurant } from './restaurant';
import { IUserService } from 'src/user/interfaces/user-service.interface';
import { IRestaurantRepository } from 'src/infrastructure/data_access/repositories/interfaces/restaurant-repository.interface';
import { IContextService } from 'src/infrastructure/context/context-service.interface';
import { ICompanyService } from 'src/company/interfaces/company-service.interface';
import { IRestaurantResponse } from './interfaces/restaurant-response.interface';
import { CreateRestaurantDTO, RestaurantAdminDTO, UpdateRestaurantDTO } from './dtos/create-restaurant.dto';
import { User } from 'src/user/user';
import { Company } from 'src/company/company';
import { Audit } from 'src/domain/audit/audit';
import { Role } from 'src/application/constants/constants';
import { SaveFileLocally } from 'src/application/saveFileLocally';
import { IRestaurantService } from './interfaces/restaurant-service.interface';
import { RestaurantStatus } from './constants/constants';

@Injectable()
export class RestaurantService implements IRestaurantService {
  private context: Context;

  constructor(
    @Inject(TYPES.IContextService) private readonly contextService: IContextService,
    @Inject(TYPES.IUserService) private readonly userService: IUserService,
    @Inject(TYPES.IRestaurantRepository) private readonly restaurantRepository: IRestaurantRepository,
    @Inject(TYPES.ICompanyService) private readonly companyService: ICompanyService,
    private readonly restaurantMapper: RestaurantMapper,
    @InjectConnection() private readonly connection: Connection,
  ) {
    this.context = this.contextService.getContext();
  }

  async getRestaurants(): Promise<Result<IRestaurantResponse[]>> {
    const restaurantsResult = await this.restaurantRepository.getRestaurantsWithFilters();
    if (!restaurantsResult.isSuccess) {
      throwApplicationError(HttpStatus.INTERNAL_SERVER_ERROR, 'Could not retrieve restaurants');
    }
    return Result.ok(RestaurantParser.createRestaurantsResponse(restaurantsResult.getValue()), 'Restaurants retrieved successfully');
  }

  async getRestaurantById(restaurantId: Types.ObjectId): Promise<Result<IRestaurantResponse>> {
    const restaurant = await this.getRestaurantByI(restaurantId);
    return Result.ok(RestaurantParser.createRestaurantResponse(restaurant), 'Restaurant retrieved successfully');
  }

  async getRestaurantByI(restaurantId: Types.ObjectId): Promise<Restaurant> {
    const restaurantResult = await this.restaurantRepository.getRestaurantById(restaurantId);
    if (!restaurantResult.isSuccess) {
      throwApplicationError(HttpStatus.NOT_FOUND, 'Restaurant not found');
    }
    return restaurantResult.getValue();
  }

  async createRestaurant(
    data: CreateRestaurantDTO,
    logoFile: Express.Multer.File,
    coverImageFile: Express.Multer.File
  ): Promise<Result<IRestaurantResponse>> {
    const session = await this.connection.startSession();
    try {
      session.startTransaction();

      const { restaurantAdminData } = data;
      const companyAdmin: User = await this.userService.getContextUser();
      const company: Company = await this.companyService.getCompanyByCompanyAdmin(companyAdmin.id);

      const logo = await SaveFileLocally(logoFile, 'restaurant-logos');
      const image = await SaveFileLocally(coverImageFile, 'restaurant-covers');

      const restaurantAdmin: User = await this.userService.createAdmin(
        restaurantAdminData,
        Role.RESTAURANT_ADMINISTRATOR
      );

      const audit: Audit = Audit.createInsertContext(this.context);

      const restaurant: Restaurant = Restaurant.create(
        {
          ...data,
          logo,
          image,
          company,
          restaurantAdminId: restaurantAdmin.id,
          restaurantAdmin,
          companyId: company.id,
          status: RestaurantStatus.ACTIVE,
          audit,
        },
        new Types.ObjectId()
      ).getValue();

      const restaurantDataModel = this.restaurantMapper.toPersistence(restaurant);
      const restaurantResult = await this.restaurantRepository.createRestaurant(restaurantDataModel);

      if (!restaurantResult.isSuccess) {
        throwApplicationError(HttpStatus.INTERNAL_SERVER_ERROR, 'Restaurant could not be created');
      }

      await session.commitTransaction();

      const newRestaurant = restaurantResult.getValue();
      const response = await this.restaurantRepository.getRestaurantById(newRestaurant.id);

      return Result.ok(RestaurantParser.createRestaurantResponse(response.getValue()), 'Restaurant created successfully');
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async getRestaurantsByCompany(): Promise<Result<IRestaurantResponse[]>> {
    const companyAdmin: User = await this.userService.getContextUser();
    const company = await this.companyService.getCompanyByCompanyAdmin(companyAdmin.id);
    const restaurantsResult = await this.restaurantRepository.getRestaurantsByCompanyId(company.id);
    if (!restaurantsResult.isSuccess) {
      throwApplicationError(HttpStatus.INTERNAL_SERVER_ERROR, 'Could not retrieve restaurants');
    }
    return Result.ok(RestaurantParser.createRestaurantsResponse(restaurantsResult.getValue()), 'Restaurants retrieved successfully');
  }

  async getCompanyRestaurantById(restaurantId: Types.ObjectId): Promise<Result<IRestaurantResponse>> {
    const companyAdmin: User = await this.userService.getContextUser();
    const company = await this.companyService.getCompanyByCompanyAdmin(companyAdmin.id);
    const restaurantsResult = await this.restaurantRepository.getRestaurantsByCompanyId(company.id);
    if (!restaurantsResult.isSuccess) {
      throwApplicationError(HttpStatus.INTERNAL_SERVER_ERROR, 'Could not retrieve restaurants');
    }
    const restaurants = restaurantsResult.getValue();
    const targetRestaurant = restaurants.find((restaurant) => restaurant.id.toString() === restaurantId.toString());
    if (!targetRestaurant) {
      throwApplicationError(HttpStatus.UNAUTHORIZED, 'You do not have access to this restaurant');
    }
    return Result.ok(RestaurantParser.createRestaurantResponse(targetRestaurant!), 'Restaurant retrieved successfully');
  }

  async changeRestaurantAdmin(restaurantId: Types.ObjectId, restaurantAdminData: RestaurantAdminDTO): Promise<Result<IRestaurantResponse>> {
    const session = await this.connection.startSession();
    try {
      session.startTransaction();

      const companyAdmin: User = await this.userService.getContextUser();
      const company = await this.companyService.getCompanyByCompanyAdmin(companyAdmin.id);
      const restaurantsResult = await this.restaurantRepository.getRestaurantsByCompanyId(company.id);
      
      if (!restaurantsResult.isSuccess) {
        throwApplicationError(HttpStatus.INTERNAL_SERVER_ERROR, 'Could not retrieve company restaurants');
      }

      const restaurants = restaurantsResult.getValue();
      const targetRestaurant = restaurants.find((restaurant) => restaurant?.id?.toString() === restaurantId?.toString());
      if (!targetRestaurant) {
        throwApplicationError(HttpStatus.UNAUTHORIZED, 'You do not have access to this restaurant');
      }
      await this.userService.suspendUser(targetRestaurant!.restaurantAdminId);
      const restaurantAdmin = await this.userService.createAdmin(restaurantAdminData, Role.RESTAURANT_ADMINISTRATOR);
      
      const data = {
        auditModifiedBy: this.context.email,
        auditModifiedDateTime: new Date().toISOString(),
        restaurantAdminId: restaurantAdmin.id,
        restaurantAdmin: restaurantAdmin,
      };

      this.updateRestaurantAdmin(data, targetRestaurant!, this.context);
      await this.updateRestaurantById(restaurantId, data);
      await session.commitTransaction();

      const updatedRestaurantResult = await this.restaurantRepository.getRestaurantById(restaurantId);
      if (!updatedRestaurantResult.isSuccess) {
        throwApplicationError(HttpStatus.INTERNAL_SERVER_ERROR, 'Could not retrieve updated restaurant');
      }

      return Result.ok(RestaurantParser.createRestaurantResponse(updatedRestaurantResult.getValue()), 'Restaurant admin changed successfully');
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async getRestaurantByRestaurantAdmin(): Promise<Result<IRestaurantResponse>> {
    const restaurant = await this.getRestaurantByRAdmin();
    return Result.ok(RestaurantParser.createRestaurantResponse(restaurant), 'Restaurant retrieved successfully');
  }

  async updateMyRestaurant(
    restaurantData: UpdateRestaurantDTO,
    logoFile?: Express.Multer.File,
    coverImageFile?: Express.Multer.File
  ): Promise<Result<IRestaurantResponse>> {
    const session = await this.connection.startSession();
    try {
      session.startTransaction();

      const restaurantAdmin: User = await this.userService.getContextUser();
      const restaurantsResult = await this.restaurantRepository.getRestaurantByRestaurantAdmin(restaurantAdmin.id);
      
      if (!restaurantsResult.isSuccess) {
        throwApplicationError(HttpStatus.NOT_FOUND, 'Restaurant not found');
      }

      const restaurant = restaurantsResult.getValue();
      const data: any = {
        auditModifiedBy: this.context.email,
        auditModifiedDateTime: new Date().toISOString(),
        ...restaurantData,
      };

      if (logoFile) {
        data.logo = await SaveFileLocally(logoFile, 'restaurant-logos');
      }

      if (coverImageFile) {
        data.image = await SaveFileLocally(coverImageFile, 'restaurant-covers');
      }

      this.updateRestaurantData(data, restaurant, this.context);
      await this.updateRestaurantById(restaurant.id, data);
      await session.commitTransaction();

      const updatedRestaurantResult = await this.restaurantRepository.getRestaurantById(restaurant.id);
      if (!updatedRestaurantResult.isSuccess) {
        throwApplicationError(HttpStatus.INTERNAL_SERVER_ERROR, 'Could not retrieve updated restaurant');
      }

      return Result.ok(RestaurantParser.createRestaurantResponse(updatedRestaurantResult.getValue()), 'Restaurant updated successfully');
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async updateRestaurant(
    restaurantId: Types.ObjectId,
    restaurantData: UpdateRestaurantDTO,
    logoFile?: Express.Multer.File,
    coverImageFile?: Express.Multer.File
  ): Promise<Result<IRestaurantResponse>> {
    const session = await this.connection.startSession();
    try {
      session.startTransaction();

      const restaurantAdmin: User = await this.userService.getContextUser();
      const restaurantsResult = await this.restaurantRepository.getRestaurantByRestaurantAdmin(restaurantAdmin.id);
      
      if (!restaurantsResult.isSuccess) {
        throwApplicationError(HttpStatus.NOT_FOUND, 'Restaurant not found');
      }

      const restaurant = restaurantsResult.getValue();
      const data: any = {
        auditModifiedBy: this.context.email,
        auditModifiedDateTime: new Date().toISOString(),
        ...restaurantData,
      };

      if (logoFile) {
        data.logo = await SaveFileLocally(logoFile, 'restaurant-logos');
      }

      if (coverImageFile) {
        data.image = await SaveFileLocally(coverImageFile, 'restaurant-covers');
      }

      this.updateRestaurantData(data, restaurant, this.context);
      await this.updateRestaurantById(restaurantId, data);
      await session.commitTransaction();

      const updatedRestaurantResult = await this.restaurantRepository.getRestaurantById(restaurantId);
      if (!updatedRestaurantResult.isSuccess) {
        throwApplicationError(HttpStatus.INTERNAL_SERVER_ERROR, 'Could not retrieve updated restaurant');
      }

      return Result.ok(RestaurantParser.createRestaurantResponse(updatedRestaurantResult.getValue()), 'Restaurant updated successfully');
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  private updateRestaurantData(data: any, restaurant: Restaurant, context: Context) {
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && key in restaurant) {
        (restaurant as any)[key] = value;
      }
    });
    Audit.updateContext(context.email, restaurant);
  }

  private updateRestaurantAdmin(data: any, restaurant: Restaurant, context: Context) {
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && key in restaurant) {
        (restaurant as any)[key] = value;
      }
    });
    Audit.updateContext(context.email, restaurant);
  }

  private async updateRestaurantById(id: Types.ObjectId, data: any): Promise<Restaurant> {
    const updatedRestaurantResult = await this.restaurantRepository.updateRestaurant(id, data);
    if (!updatedRestaurantResult.isSuccess) {
      throwApplicationError(HttpStatus.INTERNAL_SERVER_ERROR, 'Restaurant update failed');
    }
    return updatedRestaurantResult.getValue();
  }

  async getRestaurantByRAdmin(): Promise<Restaurant> {
    const restaurantAdmin: User = await this.userService.getContextUser();
    const restaurantResult = await this.restaurantRepository.getRestaurantByRestaurantAdmin(restaurantAdmin.id);
    if (!restaurantResult.isSuccess) {
      throwApplicationError(HttpStatus.NOT_FOUND, 'Restaurant not found');
    }
    return restaurantResult.getValue();
  }
}