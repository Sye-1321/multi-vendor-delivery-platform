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
  Query,
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
  ApiNoContentResponse,
  ApiResultResponse,
  mongoIdParam,
} from 'src/infrastructure/swagger/swagger.decorators';

@ApiTags('Menu items')
@Controller()
export class MenuItemController {
  constructor(
    @Inject(TYPES.IMenuItemService)
    private readonly itemService: IMenuItemService,
  ) {}

  @UseGuards(AccessAuthGuard, RoleGuard)
  @Roles(Role.RESTAURANT_ADMINISTRATOR)
  @Post('restaurants/me/menu-items')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('image', IMAGE_UPLOAD_OPTIONS),
    ParseStringifiedJsonInterceptor,
  )
  @ApiOperation({ summary: 'Create a menu item for the managed restaurant' })
  @ApiBearerAuth('access-token')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'price', 'availability', 'image'],
      properties: {
        name: { type: 'string' },
        price: { type: 'number', minimum: 0 },
        availability: { type: 'boolean' },
        description: { type: 'string' },
        image: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResultResponse(HttpStatus.CREATED)
  async createItem(
    @Body() request: CreateMenuItemDTO,
    @UploadedFile() image: Express.Multer.File,
  ): Promise<Result<IMenuItemResponse>> {
    return await this.itemService.createMenuItem(request, image);
  }

  @UseGuards(AccessAuthGuard, RoleGuard)
  @Roles(Role.RESTAURANT_ADMINISTRATOR)
  @Get('restaurants/me/menu-items')
  @ApiOperation({ summary: 'List menu items for the managed restaurant' })
  @ApiBearerAuth('access-token')
  @ApiResultResponse(HttpStatus.OK)
  @HttpCode(HttpStatus.OK)
  async getItems(
    @Query() pagination: PaginationQueryDTO,
  ): Promise<Result<IMenuItemResponse[]>> {
    return await this.itemService.getMenuItems(pagination);
  }

  @UseGuards(AccessAuthGuard, RoleGuard)
  @Roles(Role.RESTAURANT_ADMINISTRATOR)
  @Get('restaurants/me/menu-items/:menuItemId')
  @ApiOperation({ summary: 'Get a managed menu item by ID' })
  @ApiBearerAuth('access-token')
  @ApiResultResponse(HttpStatus.OK)
  @mongoIdParam('menuItemId')
  @HttpCode(HttpStatus.OK)
  async getItemById(
    @Param('menuItemId', ParseObjectIdPipe) itemId: Types.ObjectId,
  ): Promise<Result<IMenuItemResponse>> {
    return await this.itemService.getMenuItemById(itemId);
  }

  @UseGuards(AccessAuthGuard, RoleGuard)
  @Roles(Role.RESTAURANT_ADMINISTRATOR)
  @Put('restaurants/me/menu-items/:menuItemId')
  @ApiOperation({ summary: 'Update a menu item for the managed restaurant' })
  @ApiBearerAuth('access-token')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        price: { type: 'number', minimum: 0 },
        availability: { type: 'boolean' },
        description: { type: 'string' },
        image: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResultResponse(HttpStatus.OK)
  @mongoIdParam('menuItemId')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('image', IMAGE_UPLOAD_OPTIONS),
    ParseStringifiedJsonInterceptor,
  )
  async updateItem(
    @Param('menuItemId', ParseObjectIdPipe) itemId: Types.ObjectId,
    @Body() request: UpdateMenuItemDTO,
    @UploadedFile() image: Express.Multer.File,
  ): Promise<Result<IMenuItemResponse>> {
    return await this.itemService.updateMenuItem(itemId, request, image);
  }

  @UseGuards(AccessAuthGuard, RoleGuard)
  @Roles(Role.RESTAURANT_ADMINISTRATOR)
  @Delete('restaurants/me/menu-items/:menuItemId')
  @ApiOperation({ summary: 'Delete a menu item from the managed restaurant' })
  @ApiBearerAuth('access-token')
  @ApiNoContentResponse()
  @mongoIdParam('menuItemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteItem(
    @Param('menuItemId', ParseObjectIdPipe) itemId: Types.ObjectId,
  ): Promise<Result<void>> {
    return await this.itemService.deleteMenuItem(itemId);
  }

  @Get('restaurants/:restaurantId/menu-items')
  @ApiOperation({ summary: 'List a restaurant’s public menu items' })
  @ApiResultResponse(HttpStatus.OK)
  @mongoIdParam('restaurantId')
  @HttpCode(HttpStatus.OK)
  async getRestaurantItems(
    @Param('restaurantId', ParseObjectIdPipe) restaurantId: Types.ObjectId,
    @Query() pagination: PaginationQueryDTO,
  ): Promise<Result<IMenuItemResponse[]>> {
    return await this.itemService.getRestaurantMenuItems(
      restaurantId,
      pagination,
    );
  }

  @Get('restaurants/:restaurantId/menu-items/:menuItemId')
  @ApiOperation({ summary: 'Get a restaurant menu item by ID' })
  @ApiResultResponse(HttpStatus.OK)
  @mongoIdParam('restaurantId')
  @mongoIdParam('menuItemId')
  @HttpCode(HttpStatus.OK)
  async getRestaurantItemById(
    @Param('restaurantId', ParseObjectIdPipe) restaurantId: Types.ObjectId,
    @Param('menuItemId', ParseObjectIdPipe) itemId: Types.ObjectId,
  ): Promise<Result<IMenuItemResponse>> {
    return await this.itemService.getRestaurantMenuItemById(
      restaurantId,
      itemId,
    );
  }
}
