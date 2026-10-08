import {
  Body,
  Controller,
  Inject,
  Post,
  Get,
  Param,
  Put,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { TYPES } from '../application/constants/types';
import { Result } from '../domain/result/result';
import { Types } from 'mongoose';
import { IMenuItemService } from './interfaces/menu-item-service.interface';
import {
  CreateMenuItemDTO,
  UpdateMenuItemDTO,
} from './dtos/create-menu-item.dto';
import { IMenuItemResponse } from './interfaces/menu-item-response.interface';
import { AccessAuthGuard } from 'src/infrastructure/guards/access-auth.guard';
import { RoleGuard } from 'src/infrastructure/guards/role-guard';
import { Role } from 'src/application/constants/constants';
import { Roles } from 'src/infrastructure/decorators/roles.decorators';
import { FileInterceptor } from '@nestjs/platform-express';
import { ParseStringifiedJsonInterceptor } from 'src/infrastructure/utilities/ParseStringifiedJsonInterceptor';
import { ParseObjectIdPipe } from 'src/infrastructure/utilities/parse-object-id.pipe';

@Controller()
export class MenuItemController {
  constructor(
    @Inject(TYPES.IMenuItemService)
    private readonly itemService: IMenuItemService,
  ) {}

  @UseGuards(AccessAuthGuard, RoleGuard)
  @Roles(Role.RESTAURANT_ADMINISTRATOR)
  @Post('me/menu-items')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('image'), ParseStringifiedJsonInterceptor)
  async createItem(
    @Body() request: CreateMenuItemDTO,
    @UploadedFile() image: Express.Multer.File,
  ): Promise<Result<IMenuItemResponse>> {
    return await this.itemService.createMenuItem(request, image);
  }

  @UseGuards(AccessAuthGuard, RoleGuard)
  @Roles(Role.RESTAURANT_ADMINISTRATOR)
  @Get('me/menu-items')
  @HttpCode(HttpStatus.OK)
  async getItems(): Promise<Result<IMenuItemResponse[]>> {
    return await this.itemService.getMenuItems();
  }

  @UseGuards(AccessAuthGuard, RoleGuard)
  @Roles(Role.RESTAURANT_ADMINISTRATOR)
  @Get('me/menu-items/:id')
  @HttpCode(HttpStatus.OK)
  async getItemById(
    @Param('id', ParseObjectIdPipe) itemId: Types.ObjectId,
  ): Promise<Result<IMenuItemResponse>> {
    return await this.itemService.getMenuItemById(itemId);
  }

  @UseGuards(AccessAuthGuard, RoleGuard)
  @Roles(Role.RESTAURANT_ADMINISTRATOR)
  @Put('me/menu-items/:id')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('image'), ParseStringifiedJsonInterceptor)
  async updateItem(
    @Param('id', ParseObjectIdPipe) itemId: Types.ObjectId,
    @Body() request: UpdateMenuItemDTO,
    @UploadedFile() image: Express.Multer.File,
  ): Promise<Result<IMenuItemResponse>> {
    return await this.itemService.updateMenuItem(itemId, request, image);
  }

  @UseGuards(AccessAuthGuard, RoleGuard)
  @Roles(Role.RESTAURANT_ADMINISTRATOR)
  @Delete('me/menu-items/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteItem(
    @Param('id', ParseObjectIdPipe) itemId: Types.ObjectId,
  ): Promise<Result<void>> {
    return await this.itemService.deleteMenuItem(itemId);
  }

  @Get(':restaurantId/menu-items')
  @HttpCode(HttpStatus.OK)
  async getRestaurantItems(
    @Param('restaurantId', ParseObjectIdPipe) restaurantId: Types.ObjectId,
  ): Promise<Result<IMenuItemResponse[]>> {
    return await this.itemService.getRestaurantMenuItems(restaurantId);
  }

  @Get(':restaurantId/menu-items/:id')
  @HttpCode(HttpStatus.OK)
  async getRestaurantItemById(
    @Param('restaurantId', ParseObjectIdPipe) restaurantId: Types.ObjectId,
    @Param('id', ParseObjectIdPipe) itemId: Types.ObjectId,
  ): Promise<Result<IMenuItemResponse>> {
    return await this.itemService.getRestaurantMenuItemById(
      restaurantId,
      itemId,
    );
  }
}
