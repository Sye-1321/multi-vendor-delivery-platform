import {
  Controller,
  Param,
  Body,
  Put,
  Post,
  Get,
  HttpStatus,
  Inject,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { TYPES } from 'src/application/constants/types';
import { AccessAuthGuard } from 'src/infrastructure/guards/access-auth.guard';
import { RoleGuard } from 'src/infrastructure/guards/role-guard';
import { Roles } from 'src/infrastructure/decorators/roles.decorators';
import { Role } from 'src/application/constants/constants';
import { Result } from '../domain/result/result';
import {
  CreateRestaurantDTO,
  RestaurantAdminDTO,
  UpdateRestaurantDTO,
} from './dtos/create-restaurant.dto';
import { IRestaurantResponse } from './interfaces/restuarant-response.interface';
import { IRestaurantService } from './interfaces/restaurant-service.interface';
import { ParseStringifiedJsonInterceptor } from 'src/infrastructure/utilities/ParseStringifiedJsonInterceptor';

@Controller()
export class RestaurantController {
  constructor(
    @Inject(TYPES.IRestaurantService)
    private readonly restaurantService: IRestaurantService,
  ) {}

  @Get('restaurants')
  async getAllRestaurants(): Promise<Result<IRestaurantResponse[]>> {
    return this.restaurantService.getRestaurants();
  }

  @Get('restaurants/:id')
  async getRestaurantById(
  @Param('id') restaurantId: Types.ObjectId,
  ): Promise<Result<IRestaurantResponse>> {
    return this.restaurantService.getRestaurantById(restaurantId);
  }

  //RAdmin
  @UseGuards(AccessAuthGuard, RoleGuard)
  @Get('restaurants/me')
  @Roles(Role.RESTAURANT_ADMINISTRATOR)
  async getRestaurantByRestaurantAdmin(): Promise<Result<IRestaurantResponse>> {
    return this.restaurantService.getRestaurantByRestaurantAdmin();
  }

  @UseGuards(AccessAuthGuard, RoleGuard)
  @Put('restaurants/me')
  @Roles(Role.RESTAURANT_ADMINISTRATOR)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'logo', maxCount: 1 },
      { name: 'image', maxCount: 1 },
    ]),
    ParseStringifiedJsonInterceptor,
  )
  async updateRestaurant(
    @Body() updateData: UpdateRestaurantDTO,
    @UploadedFiles() files: {
      logo?: Express.Multer.File[];
      image?: Express.Multer.File[];
    },
  ): Promise<Result<IRestaurantResponse>> {
    const logo = files.logo?.[0];
    const image = files.image?.[0];

    return this.restaurantService.updateMyRestaurant(updateData, logo, image);
  }

  // CAdmin
  @UseGuards(AccessAuthGuard, RoleGuard)
  @Get('company/restaurants')
  @Roles(Role.BUSINESS_ADMINISTRATOR)
  async getRestaurantsByCompany(): Promise<Result<IRestaurantResponse[]>> {
    return this.restaurantService.getRestaurantsByCompany();
  }


  @UseGuards(AccessAuthGuard, RoleGuard)
  @Get('company/restaurants/:id')
  @Roles(Role.BUSINESS_ADMINISTRATOR)
  async getCompanyRestaurantById(
    @Param('id') restaurantId: Types.ObjectId,
  ): Promise<Result<IRestaurantResponse>> {
    return this.restaurantService.getCompanyRestaurantById(restaurantId);
  }

  
  @UseGuards(AccessAuthGuard, RoleGuard)
  @Put('company/restaurants/:id')
  @Roles(Role.BUSINESS_ADMINISTRATOR)
  async changeRestaurantAdmin(
    @Param('id') restaurantId: Types.ObjectId,
    @Body() data: RestaurantAdminDTO,
  ): Promise<Result<IRestaurantResponse>> {
    return this.restaurantService.changeRestaurantAdmin(restaurantId, data);
  }


  @UseGuards(AccessAuthGuard, RoleGuard)
  @Roles(Role.BUSINESS_ADMINISTRATOR)
  @Post()
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'logo', maxCount: 1 },
      { name: 'image', maxCount: 1 },
    ]),
    ParseStringifiedJsonInterceptor,
  )
  async createRestaurant(
    @UploadedFiles()
    files: {
      logo?: Express.Multer.File[];
      image?: Express.Multer.File[];
    },
    @Body() data: CreateRestaurantDTO,
  ): Promise<Result<IRestaurantResponse>> {
    const logo = files.logo?.[0];
    const image = files.image?.[0];

    if (!logo || !image) {
      return Result.fail('Both logo and image are required', HttpStatus.BAD_REQUEST);
    }

    return this.restaurantService.createRestaurant(data, logo, image);
  }


}
