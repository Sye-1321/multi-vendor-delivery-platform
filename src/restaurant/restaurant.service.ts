import { HttpStatus, Injectable, Inject } from '@nestjs/common';
import { ClientSession, Types } from 'mongoose';
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
import {
  IPublicRestaurantResponse,
  IRestaurantResponse,
} from './interfaces/restaurant-response.interface';
import {
  CreateRestaurantDTO,
  RestaurantAdminDTO,
  UpdateRestaurantDTO,
} from './dtos/create-restaurant.dto';
import { User } from 'src/user/user';
import { Company } from 'src/company/company';
import { Audit } from 'src/domain/audit/audit';
import { Role } from 'src/application/constants/constants';
import { SaveFileLocally } from 'src/application/saveFileLocally';
import { IRestaurantService } from './interfaces/restaurant-service.interface';
import { RestaurantStatus } from './constants/constants';

@Injectable()
export class RestaurantService implements IRestaurantService {
  constructor(
    @Inject(TYPES.IContextService)
    private readonly contextService: IContextService,
    @Inject(TYPES.IUserService) private readonly userService: IUserService,
    @Inject(TYPES.IRestaurantRepository)
    private readonly restaurantRepository: IRestaurantRepository,
    @Inject(TYPES.ICompanyService)
    private readonly companyService: ICompanyService,
    private readonly restaurantMapper: RestaurantMapper,
  ) {}

  private get context(): Context {
    return this.contextService.getContext();
  }

  async getRestaurants(): Promise<Result<IPublicRestaurantResponse[]>> {
    const restaurantsResult =
      await this.restaurantRepository.getRestaurantsWithFilters();
    if (!restaurantsResult.isSuccess) {
      throwApplicationError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Could not retrieve restaurants',
      );
    }
    return Result.ok(
      RestaurantParser.createPublicRestaurantsResponse(
        restaurantsResult.getValue(),
      ),
      'Restaurants retrieved successfully',
    );
  }

  async getRestaurantById(
    restaurantId: Types.ObjectId,
  ): Promise<Result<IPublicRestaurantResponse>> {
    const restaurant = await this.getRestaurantByI(restaurantId);
    return Result.ok(
      RestaurantParser.createPublicRestaurantResponse(restaurant),
      'Restaurant retrieved successfully',
    );
  }

  async getRestaurantByI(restaurantId: Types.ObjectId): Promise<Restaurant> {
    const restaurantResult =
      await this.restaurantRepository.getRestaurantById(restaurantId);
    if (!restaurantResult.isSuccess) {
      throwApplicationError(HttpStatus.NOT_FOUND, 'Restaurant not found');
    }
    return restaurantResult.getValue();
  }

  async createRestaurant(
    data: CreateRestaurantDTO,
    logoFile: Express.Multer.File,
    coverImageFile: Express.Multer.File,
  ): Promise<Result<IRestaurantResponse>> {
    const { restaurantAdminData } = data;
    const companyAdmin: User = await this.userService.getContextUser();
    const company: Company = await this.companyService.getCompanyByCompanyAdmin(
      companyAdmin.id,
    );
    const logo = await SaveFileLocally(logoFile, 'restaurant-logos');
    const image = await SaveFileLocally(coverImageFile, 'restaurant-covers');
    const audit: Audit = Audit.createInsertContext(this.context);
    const session = await this.restaurantRepository.startSession();
    try {
      const committed = await session.withTransaction(async () => {
        const registration = await this.userService.createAdminRegistration(
          restaurantAdminData,
          Role.RESTAURANT_ADMINISTRATOR,
          { session },
        );
        const restaurant = Restaurant.create(
          {
            ...data,
            logo,
            image,
            company,
            restaurantAdminId: registration.admin.id,
            restaurantAdmin: registration.admin,
            companyId: company.id,
            status: RestaurantStatus.ACTIVE,
            audit,
          },
          new Types.ObjectId(),
        ).getValue();
        const restaurantResult =
          await this.restaurantRepository.createRestaurant(
            this.restaurantMapper.toPersistence(restaurant),
            { session },
          );
        if (!restaurantResult.isSuccess) {
          throwApplicationError(
            HttpStatus.INTERNAL_SERVER_ERROR,
            'Restaurant could not be created',
          );
        }
        return { registration, restaurantId: restaurantResult.getValue().id };
      });
      if (!committed) {
        throwApplicationError(
          HttpStatus.INTERNAL_SERVER_ERROR,
          'Restaurant could not be created',
        );
      }
      await this.userService.sendAdminRegistrationEmail(
        committed.registration.admin,
        committed.registration.token,
      );
      const response = await this.restaurantRepository.getRestaurantById(
        committed.restaurantId,
      );

      return Result.ok(
        RestaurantParser.createRestaurantResponse(response.getValue()),
        'Restaurant created successfully',
      );
    } finally {
      await session.endSession();
    }
  }

  async getRestaurantsByCompany(): Promise<Result<IRestaurantResponse[]>> {
    const companyAdmin: User = await this.userService.getContextUser();
    const company = await this.companyService.getCompanyByCompanyAdmin(
      companyAdmin.id,
    );
    const restaurantsResult =
      await this.restaurantRepository.getRestaurantsByCompanyId(company.id);
    if (!restaurantsResult.isSuccess) {
      throwApplicationError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Could not retrieve restaurants',
      );
    }
    return Result.ok(
      RestaurantParser.createRestaurantsResponse(restaurantsResult.getValue()),
      'Restaurants retrieved successfully',
    );
  }

  async getCompanyRestaurantById(
    restaurantId: Types.ObjectId,
  ): Promise<Result<IRestaurantResponse>> {
    const companyAdmin: User = await this.userService.getContextUser();
    const company = await this.companyService.getCompanyByCompanyAdmin(
      companyAdmin.id,
    );
    const restaurantsResult =
      await this.restaurantRepository.getRestaurantsByCompanyId(company.id);
    if (!restaurantsResult.isSuccess) {
      throwApplicationError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Could not retrieve restaurants',
      );
    }
    const restaurants = restaurantsResult.getValue();
    const targetRestaurant = restaurants.find(
      (restaurant) => restaurant.id.toString() === restaurantId.toString(),
    );
    if (!targetRestaurant) {
      throwApplicationError(
        HttpStatus.UNAUTHORIZED,
        'You do not have access to this restaurant',
      );
    }
    return Result.ok(
      RestaurantParser.createRestaurantResponse(targetRestaurant!),
      'Restaurant retrieved successfully',
    );
  }

  async changeRestaurantAdmin(
    restaurantId: Types.ObjectId,
    restaurantAdminData: RestaurantAdminDTO,
  ): Promise<Result<IRestaurantResponse>> {
    const companyAdmin: User = await this.userService.getContextUser();
    const company = await this.companyService.getCompanyByCompanyAdmin(
      companyAdmin.id,
    );
    const restaurantsResult =
      await this.restaurantRepository.getRestaurantsByCompanyId(company.id);

    if (!restaurantsResult.isSuccess) {
      throwApplicationError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Could not retrieve company restaurants',
      );
    }

    const restaurants = restaurantsResult.getValue();
    const targetRestaurant = restaurants.find(
      (restaurant) => restaurant?.id?.toString() === restaurantId?.toString(),
    );
    if (!targetRestaurant) {
      throwApplicationError(
        HttpStatus.UNAUTHORIZED,
        'You do not have access to this restaurant',
      );
    }
    const authorizedRestaurant = targetRestaurant!;
    const oldAdminId = authorizedRestaurant.restaurantAdminId;
    const session = await this.restaurantRepository.startSession();
    try {
      const committed = await session.withTransaction(async () => {
        await this.userService.suspendUserAccount(oldAdminId, { session });
        const registration = await this.userService.createAdminRegistration(
          restaurantAdminData,
          Role.RESTAURANT_ADMINISTRATOR,
          { session },
        );
        const update = {
          auditModifiedBy: this.context.email,
          auditModifiedDateTime: new Date().toISOString(),
          restaurantAdminId: registration.admin.id,
        };
        this.updateRestaurantAdmin(update, authorizedRestaurant, this.context);
        await this.updateRestaurantById(restaurantId, update, { session });
        return registration;
      });
      if (!committed) {
        throwApplicationError(
          HttpStatus.INTERNAL_SERVER_ERROR,
          'Restaurant update failed',
        );
      }
      this.userService.publishAccessRevocation(oldAdminId);
      await this.userService.sendAdminRegistrationEmail(
        committed.admin,
        committed.token,
      );

      const updatedRestaurantResult =
        await this.restaurantRepository.getRestaurantById(restaurantId);
      if (!updatedRestaurantResult.isSuccess) {
        throwApplicationError(
          HttpStatus.INTERNAL_SERVER_ERROR,
          'Could not retrieve updated restaurant',
        );
      }

      return Result.ok(
        RestaurantParser.createRestaurantResponse(
          updatedRestaurantResult.getValue(),
        ),
        'Restaurant admin changed successfully',
      );
    } finally {
      await session.endSession();
    }
  }

  async getRestaurantByRestaurantAdmin(): Promise<Result<IRestaurantResponse>> {
    const restaurant = await this.getRestaurantByRAdmin();
    return Result.ok(
      RestaurantParser.createRestaurantResponse(restaurant),
      'Restaurant retrieved successfully',
    );
  }

  async updateMyRestaurant(
    restaurantData: UpdateRestaurantDTO,
    logoFile?: Express.Multer.File,
    coverImageFile?: Express.Multer.File,
  ): Promise<Result<IRestaurantResponse>> {
    const restaurantAdmin: User = await this.userService.getContextUser();
    const restaurantsResult =
      await this.restaurantRepository.getRestaurantByRestaurantAdmin(
        restaurantAdmin.id,
      );

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

    const updatedRestaurantResult =
      await this.restaurantRepository.getRestaurantById(restaurant.id);
    if (!updatedRestaurantResult.isSuccess) {
      throwApplicationError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Could not retrieve updated restaurant',
      );
    }

    return Result.ok(
      RestaurantParser.createRestaurantResponse(
        updatedRestaurantResult.getValue(),
      ),
      'Restaurant updated successfully',
    );
  }

  async updateRestaurant(
    restaurantId: Types.ObjectId,
    restaurantData: UpdateRestaurantDTO,
    logoFile?: Express.Multer.File,
    coverImageFile?: Express.Multer.File,
  ): Promise<Result<IRestaurantResponse>> {
    const restaurantAdmin: User = await this.userService.getContextUser();
    const restaurantsResult =
      await this.restaurantRepository.getRestaurantByRestaurantAdmin(
        restaurantAdmin.id,
      );

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

    const updatedRestaurantResult =
      await this.restaurantRepository.getRestaurantById(restaurantId);
    if (!updatedRestaurantResult.isSuccess) {
      throwApplicationError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Could not retrieve updated restaurant',
      );
    }

    return Result.ok(
      RestaurantParser.createRestaurantResponse(
        updatedRestaurantResult.getValue(),
      ),
      'Restaurant updated successfully',
    );
  }

  private updateRestaurantData(
    data: any,
    restaurant: Restaurant,
    context: Context,
  ) {
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && key in restaurant) {
        (restaurant as any)[key] = value;
      }
    });
    Audit.updateContext(context.email, restaurant);
  }

  private updateRestaurantAdmin(
    data: any,
    restaurant: Restaurant,
    context: Context,
  ) {
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && key in restaurant) {
        (restaurant as any)[key] = value;
      }
    });
    Audit.updateContext(context.email, restaurant);
  }

  private async updateRestaurantById(
    id: Types.ObjectId,
    data: any,
    options?: { session?: ClientSession },
  ): Promise<Restaurant> {
    const updatedRestaurantResult =
      await this.restaurantRepository.updateRestaurant(id, data, options);
    if (!updatedRestaurantResult.isSuccess) {
      throwApplicationError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Restaurant update failed',
      );
    }
    return updatedRestaurantResult.getValue();
  }

  async getRestaurantByRAdmin(): Promise<Restaurant> {
    const restaurantAdmin: User = await this.userService.getContextUser();
    const restaurantResult =
      await this.restaurantRepository.getRestaurantByRestaurantAdmin(
        restaurantAdmin.id,
      );
    if (!restaurantResult.isSuccess) {
      throwApplicationError(HttpStatus.NOT_FOUND, 'Restaurant not found');
    }
    return restaurantResult.getValue();
  }
}
