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

@Controller('delivery-person')
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
  @Post('system/delivery-persons')
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
  @Post('restaurant/delivery-persons')
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
  @Get('system/delivery-persons')
  @HttpCode(HttpStatus.OK)
  async getSystemWideDeliveryPersons(): Promise<
    Result<IDeliveryPersonResponse[]>
  > {
    return this.deliveryPersonService.getSystemWideDeliveryPersons();
  }

  @UseGuards(AccessAuthGuard, RoleGuard)
  @Roles(Role.RESTAURANT_ADMINISTRATOR)
  @Get('restaurant/delivery-persons')
  @HttpCode(HttpStatus.OK)
  async getDeliveryPersonsByRestaurantId(): Promise<
    Result<IDeliveryPersonResponse[]>
  > {
    return this.deliveryPersonService.getRestaurantDeliveryPersons();
  }

  @UseGuards(AccessAuthGuard, RoleGuard)
  @Roles(Role.DELIVERY_COMPANY_ADMINISTRATOR)
  @Get('system/delivery-persons/:id')
  @HttpCode(HttpStatus.OK)
  async getSystemWideDeliveryPersonById(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
  ): Promise<Result<IDeliveryPersonResponse>> {
    return this.deliveryPersonService.getSystemWideDeliveryPersonById(id);
  }

  @UseGuards(AccessAuthGuard, RoleGuard)
  @Roles(Role.RESTAURANT_ADMINISTRATOR)
  @Get('restaurant/delivery-persons/:id')
  @HttpCode(HttpStatus.OK)
  async getRestaurantDeliveryPersonById(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
  ): Promise<Result<IDeliveryPersonResponse>> {
    return this.deliveryPersonService.getRestaurantDeliveryPersonById(id);
  }

  @UseGuards(AccessAuthGuard, RoleGuard)
  @Roles(Role.DELIVERY_COMPANY_ADMINISTRATOR)
  @UseInterceptors(
    FileInterceptor('profileImage', IMAGE_UPLOAD_OPTIONS),
    ParseStringifiedJsonInterceptor,
  )
  @Patch('system/delivery-persons/:id')
  @HttpCode(HttpStatus.OK)
  async updateSystemWideDeliveryPerson(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
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
  @Patch('restaurant/delivery-persons/:id')
  @HttpCode(HttpStatus.OK)
  async updateRestaurantDeliveryPerson(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
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
