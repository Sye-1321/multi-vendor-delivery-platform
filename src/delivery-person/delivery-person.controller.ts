import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Types } from 'mongoose';
import { AccessAuthGuard } from '../infrastructure/guards/access-auth.guard';
import { Result } from '../domain/result/result';
import { IDeliveryPersonService } from './interfaces/delivery-person-service.interface';
import { RoleGuard } from 'src/infrastructure/guards/role-guard';
import { TYPES } from 'src/application/constants/types';
import { Role } from 'src/application/constants/constants';
import {
  CreateDeliveryPersonDTO,
  UpdateDeliveryPersonDTO,
} from './dtos/delivery-person.dto';
import { IDeliveryPersonResponse } from './interfaces/deliveryperson-response.interface';
import { Roles } from 'src/infrastructure/decorators/roles.decorators';
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

@ApiTags('Delivery personnel')
@ApiBearerAuth('access-token')
@Controller()
export class DeliveryPersonController {
  constructor(
    @Inject(TYPES.IDeliveryPersonService)
    private readonly deliveryPersonService: IDeliveryPersonService,
  ) {}

  @UseGuards(AccessAuthGuard, RoleGuard)
  @Roles(Role.DELIVERY_COMPANY_ADMINISTRATOR)
  @UseInterceptors(
    FileInterceptor('profileImage', IMAGE_UPLOAD_OPTIONS),
    ParseStringifiedJsonInterceptor,
  )
  @Post('delivery-persons')
  @ApiOperation({ summary: 'Create a system-wide delivery person' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'phoneNumber', 'savedAddress', 'profileImage'],
      properties: {
        name: { type: 'string' },
        phoneNumber: { type: 'string' },
        savedAddress: {
          type: 'string',
          example: '{"city":"Nairobi","subCity":"Westlands"}',
        },
        profileImage: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResultResponse(HttpStatus.CREATED)
  @HttpCode(HttpStatus.CREATED)
  async createSystemWideDeliveryPerson(
    @Body() body: CreateDeliveryPersonDTO,
    @UploadedFile() profileImage: Express.Multer.File,
  ): Promise<Result<IDeliveryPersonResponse>> {
    return this.deliveryPersonService.createSystemWideDeliveryPerson(
      body,
      profileImage,
    );
  }

  @UseGuards(AccessAuthGuard, RoleGuard)
  @Roles(Role.RESTAURANT_ADMINISTRATOR)
  @UseInterceptors(
    FileInterceptor('profileImage', IMAGE_UPLOAD_OPTIONS),
    ParseStringifiedJsonInterceptor,
  )
  @Post('restaurants/me/delivery-persons')
  @ApiOperation({
    summary: 'Create a delivery person for the managed restaurant',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'phoneNumber', 'savedAddress', 'profileImage'],
      properties: {
        name: { type: 'string' },
        phoneNumber: { type: 'string' },
        savedAddress: { type: 'string' },
        profileImage: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResultResponse(HttpStatus.CREATED)
  @HttpCode(HttpStatus.CREATED)
  async createRestaurantDeliveryPerson(
    @Body() body: CreateDeliveryPersonDTO,
    @UploadedFile() profileImage: Express.Multer.File,
  ): Promise<Result<IDeliveryPersonResponse>> {
    return this.deliveryPersonService.createRestaurantDeliveryPerson(
      body,
      profileImage,
    );
  }

  @UseGuards(AccessAuthGuard, RoleGuard)
  @Roles(Role.DELIVERY_COMPANY_ADMINISTRATOR)
  @Get('delivery-persons')
  @ApiOperation({ summary: 'List system-wide delivery personnel' })
  @ApiResultResponse(HttpStatus.OK)
  @HttpCode(HttpStatus.OK)
  async getSystemWideDeliveryPersons(
    @Query() pagination: PaginationQueryDTO,
  ): Promise<Result<IDeliveryPersonResponse[]>> {
    return this.deliveryPersonService.getSystemWideDeliveryPersons(pagination);
  }

  @UseGuards(AccessAuthGuard, RoleGuard)
  @Roles(Role.RESTAURANT_ADMINISTRATOR)
  @Get('restaurants/me/delivery-persons')
  @ApiOperation({
    summary: 'List delivery personnel for the managed restaurant',
  })
  @ApiResultResponse(HttpStatus.OK)
  @HttpCode(HttpStatus.OK)
  async getDeliveryPersonsByRestaurantId(
    @Query() pagination: PaginationQueryDTO,
  ): Promise<Result<IDeliveryPersonResponse[]>> {
    return this.deliveryPersonService.getRestaurantDeliveryPersons(pagination);
  }

  @UseGuards(AccessAuthGuard, RoleGuard)
  @Roles(Role.DELIVERY_COMPANY_ADMINISTRATOR)
  @Get('delivery-persons/:deliveryPersonId')
  @ApiOperation({ summary: 'Get a system-wide delivery person by ID' })
  @ApiResultResponse(HttpStatus.OK)
  @mongoIdParam('deliveryPersonId')
  @HttpCode(HttpStatus.OK)
  async getSystemWideDeliveryPersonById(
    @Param('deliveryPersonId', ParseObjectIdPipe) id: Types.ObjectId,
  ): Promise<Result<IDeliveryPersonResponse>> {
    return this.deliveryPersonService.getSystemWideDeliveryPersonById(id);
  }

  @UseGuards(AccessAuthGuard, RoleGuard)
  @Roles(Role.RESTAURANT_ADMINISTRATOR)
  @Get('restaurants/me/delivery-persons/:deliveryPersonId')
  @ApiOperation({ summary: 'Get a restaurant delivery person by ID' })
  @ApiResultResponse(HttpStatus.OK)
  @mongoIdParam('deliveryPersonId')
  @HttpCode(HttpStatus.OK)
  async getRestaurantDeliveryPersonById(
    @Param('deliveryPersonId', ParseObjectIdPipe) id: Types.ObjectId,
  ): Promise<Result<IDeliveryPersonResponse>> {
    return this.deliveryPersonService.getRestaurantDeliveryPersonById(id);
  }

  @UseGuards(AccessAuthGuard, RoleGuard)
  @Roles(Role.DELIVERY_COMPANY_ADMINISTRATOR)
  @UseInterceptors(
    FileInterceptor('profileImage', IMAGE_UPLOAD_OPTIONS),
    ParseStringifiedJsonInterceptor,
  )
  @Patch('delivery-persons/:deliveryPersonId')
  @ApiOperation({ summary: 'Update a system-wide delivery person' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        phoneNumber: { type: 'string' },
        savedAddress: { type: 'string' },
        profileImage: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResultResponse(HttpStatus.OK)
  @mongoIdParam('deliveryPersonId')
  @HttpCode(HttpStatus.OK)
  async updateSystemWideDeliveryPerson(
    @Param('deliveryPersonId', ParseObjectIdPipe) id: Types.ObjectId,
    @Body() body: UpdateDeliveryPersonDTO,
    @UploadedFile() profileImage: Express.Multer.File,
  ): Promise<Result<IDeliveryPersonResponse>> {
    return this.deliveryPersonService.updateSystemWideDeliveryPerson(
      id,
      body,
      profileImage,
    );
  }

  @UseGuards(AccessAuthGuard, RoleGuard)
  @Roles(Role.RESTAURANT_ADMINISTRATOR)
  @UseInterceptors(
    FileInterceptor('profileImage', IMAGE_UPLOAD_OPTIONS),
    ParseStringifiedJsonInterceptor,
  )
  @Patch('restaurants/me/delivery-persons/:deliveryPersonId')
  @ApiOperation({ summary: 'Update a restaurant delivery person' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        phoneNumber: { type: 'string' },
        savedAddress: { type: 'string' },
        profileImage: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResultResponse(HttpStatus.OK)
  @mongoIdParam('deliveryPersonId')
  @HttpCode(HttpStatus.OK)
  async updateRestaurantDeliveryPerson(
    @Param('deliveryPersonId', ParseObjectIdPipe) id: Types.ObjectId,
    @Body() body: UpdateDeliveryPersonDTO,
    @UploadedFile() profileImage: Express.Multer.File,
  ): Promise<Result<IDeliveryPersonResponse>> {
    return this.deliveryPersonService.updateRestaurantDeliveryPerson(
      id,
      body,
      profileImage,
    );
  }
}
