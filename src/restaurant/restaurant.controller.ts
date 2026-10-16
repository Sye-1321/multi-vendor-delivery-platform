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
  Query,
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
import {
  IPublicRestaurantResponse,
  IRestaurantResponse,
} from './interfaces/restaurant-response.interface';
import { IRestaurantService } from './interfaces/restaurant-service.interface';
import { ParseStringifiedJsonInterceptor } from 'src/infrastructure/utilities/ParseStringifiedJsonInterceptor';
import { ParseObjectIdPipe } from 'src/infrastructure/utilities/parse-object-id.pipe';
import { IMAGE_UPLOAD_OPTIONS } from 'src/application/image-upload.options';
import { PaginationQueryDTO } from 'src/shared/dtos/pagination-query.dto';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  ApiResultResponse,
  mongoIdParam,
} from 'src/infrastructure/swagger/swagger.decorators';

@ApiTags('Restaurants')
@Controller()
export class RestaurantController {
  constructor(
    @Inject(TYPES.IRestaurantService)
    private readonly restaurantService: IRestaurantService,
  ) {}

  @Get('restaurants')
  @ApiOperation({ summary: 'List public restaurants' })
  @ApiResultResponse(HttpStatus.OK)
  async getAllRestaurants(
    @Query() pagination: PaginationQueryDTO,
  ): Promise<Result<IPublicRestaurantResponse[]>> {
    return this.restaurantService.getRestaurants(pagination);
  }

  //RAdmin
  @UseGuards(AccessAuthGuard, RoleGuard)
  @Get('restaurants/me')
  @ApiOperation({
    summary: 'Get the restaurant managed by the current administrator',
  })
  @ApiBearerAuth('access-token')
  @ApiResultResponse(HttpStatus.OK)
  @Roles(Role.RESTAURANT_ADMINISTRATOR)
  async getRestaurantByRestaurantAdmin(): Promise<Result<IRestaurantResponse>> {
    return this.restaurantService.getRestaurantByRestaurantAdmin();
  }

  @Get('restaurants/:restaurantId')
  @ApiOperation({ summary: 'Get a public restaurant by ID' })
  @ApiResultResponse(HttpStatus.OK)
  @mongoIdParam('restaurantId')
  async getRestaurantById(
    @Param('restaurantId', ParseObjectIdPipe) restaurantId: Types.ObjectId,
  ): Promise<Result<IPublicRestaurantResponse>> {
    return this.restaurantService.getRestaurantById(restaurantId);
  }

  @UseGuards(AccessAuthGuard, RoleGuard)
  @Put('restaurants/me')
  @ApiOperation({ summary: 'Update the managed restaurant' })
  @ApiBearerAuth('access-token')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        phoneNumber: { type: 'string' },
        openingHours: { type: 'string' },
        closingHours: { type: 'string' },
        description: { type: 'string' },
        deliveryPersonAvailability: { type: 'boolean' },
        savedAddress: {
          type: 'string',
          example: '{"city":"Nairobi","subCity":"Westlands"}',
        },
        logo: { type: 'string', format: 'binary' },
        image: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResultResponse(HttpStatus.OK)
  @Roles(Role.RESTAURANT_ADMINISTRATOR)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'logo', maxCount: 1 },
        { name: 'image', maxCount: 1 },
      ],
      IMAGE_UPLOAD_OPTIONS,
    ),
    ParseStringifiedJsonInterceptor,
  )
  async updateRestaurant(
    @Body() updateData: UpdateRestaurantDTO,
    @UploadedFiles()
    files: {
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
  @Get('companies/me/restaurants')
  @ApiOperation({
    summary: 'List restaurants belonging to the current company',
  })
  @ApiBearerAuth('access-token')
  @ApiResultResponse(HttpStatus.OK)
  @Roles(Role.BUSINESS_ADMINISTRATOR)
  async getRestaurantsByCompany(
    @Query() pagination: PaginationQueryDTO,
  ): Promise<Result<IRestaurantResponse[]>> {
    return this.restaurantService.getRestaurantsByCompany(pagination);
  }

  @UseGuards(AccessAuthGuard, RoleGuard)
  @Get('companies/me/restaurants/:restaurantId')
  @ApiOperation({ summary: 'Get a company restaurant by ID' })
  @ApiBearerAuth('access-token')
  @ApiResultResponse(HttpStatus.OK)
  @mongoIdParam('restaurantId')
  @Roles(Role.BUSINESS_ADMINISTRATOR)
  async getCompanyRestaurantById(
    @Param('restaurantId', ParseObjectIdPipe) restaurantId: Types.ObjectId,
  ): Promise<Result<IRestaurantResponse>> {
    return this.restaurantService.getCompanyRestaurantById(restaurantId);
  }

  @UseGuards(AccessAuthGuard, RoleGuard)
  @Put('companies/me/restaurants/:restaurantId/administrator')
  @ApiOperation({ summary: 'Change a restaurant administrator' })
  @ApiBearerAuth('access-token')
  @ApiResultResponse(HttpStatus.OK)
  @mongoIdParam('restaurantId')
  @Roles(Role.BUSINESS_ADMINISTRATOR)
  async changeRestaurantAdmin(
    @Param('restaurantId', ParseObjectIdPipe) restaurantId: Types.ObjectId,
    @Body() data: RestaurantAdminDTO,
  ): Promise<Result<IRestaurantResponse>> {
    return this.restaurantService.changeRestaurantAdmin(restaurantId, data);
  }

  @UseGuards(AccessAuthGuard, RoleGuard)
  @Roles(Role.BUSINESS_ADMINISTRATOR)
  @Post('companies/me/restaurants')
  @ApiOperation({ summary: 'Create a restaurant for the current company' })
  @ApiBearerAuth('access-token')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: [
        'name',
        'phoneNumber',
        'openingHours',
        'closingHours',
        'deliveryPersonAvailability',
        'savedAddress',
        'restaurantAdminData',
        'logo',
        'image',
      ],
      properties: {
        name: { type: 'string' },
        phoneNumber: { type: 'string' },
        openingHours: { type: 'string' },
        closingHours: { type: 'string' },
        description: { type: 'string' },
        deliveryPersonAvailability: { type: 'boolean' },
        savedAddress: {
          type: 'string',
          example: '{"city":"Nairobi","subCity":"Westlands"}',
        },
        restaurantAdminData: {
          type: 'string',
          example:
            '{"name":"Admin User","email":"admin@example.com","phoneNumber":"251911234567","savedAddress":{"city":"Nairobi","subCity":"Westlands"}}',
        },
        logo: { type: 'string', format: 'binary' },
        image: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResultResponse(HttpStatus.CREATED)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'logo', maxCount: 1 },
        { name: 'image', maxCount: 1 },
      ],
      IMAGE_UPLOAD_OPTIONS,
    ),
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
      return Result.fail(
        'Both logo and image are required',
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.restaurantService.createRestaurant(data, logo, image);
  }
}
