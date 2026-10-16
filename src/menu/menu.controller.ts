import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Put,
  Delete,
  Inject,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpStatus,
  HttpCode,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Types } from 'mongoose';
import { TYPES } from 'src/application/constants/types';
import { Result } from 'src/domain/result/result';
import { AccessAuthGuard } from 'src/infrastructure/guards/access-auth.guard';
import { RoleGuard } from 'src/infrastructure/guards/role-guard';
import { Roles } from 'src/infrastructure/decorators/roles.decorators';
import { Role } from 'src/application/constants/constants';
import { ParseStringifiedJsonInterceptor } from 'src/infrastructure/utilities/ParseStringifiedJsonInterceptor';
import { IMenuService } from 'src/menu/interfaces/menu-service.interface';
import { IMenuResponse } from './interfaces/menu-reponse.interface';
import { CreateMenuDTO, UpdateMenuDTO } from './dtos/menu.dto';
import { ParseObjectIdPipe } from 'src/infrastructure/utilities/parse-object-id.pipe';
import { IMAGE_UPLOAD_OPTIONS } from 'src/application/image-upload.options';
import { PaginationQueryDTO } from 'src/shared/dtos/pagination-query.dto';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiExtraModels,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  ApiResultResponse,
  mongoIdParam,
} from 'src/infrastructure/swagger/swagger.decorators';

@ApiTags('Menus')
@ApiExtraModels(CreateMenuDTO, UpdateMenuDTO)
@Controller()
export class MenuController {
  constructor(
    @Inject(TYPES.IMenuService) private readonly menuService: IMenuService,
  ) {}

  @UseGuards(AccessAuthGuard, RoleGuard)
  @Roles(Role.RESTAURANT_ADMINISTRATOR)
  @UseInterceptors(
    FileInterceptor('image', IMAGE_UPLOAD_OPTIONS),
    ParseStringifiedJsonInterceptor,
  )
  @HttpCode(HttpStatus.CREATED)
  @Post('restaurants/me/menus')
  @ApiOperation({ summary: 'Create a menu for the managed restaurant' })
  @ApiBearerAuth('access-token')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'image'],
      properties: {
        name: { type: 'string' },
        menuItemsIds: {
          type: 'string',
          description: 'JSON array of menu item ObjectIds',
          example: '["507f1f77bcf86cd799439011"]',
        },
        image: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResultResponse(HttpStatus.CREATED)
  async createMenu(
    @Body() props: CreateMenuDTO,
    @UploadedFile() image: Express.Multer.File,
  ): Promise<Result<IMenuResponse>> {
    return this.menuService.createMenu(props, image);
  }

  @UseGuards(AccessAuthGuard, RoleGuard)
  @Roles(Role.RESTAURANT_ADMINISTRATOR)
  @HttpCode(HttpStatus.OK)
  @Delete('restaurants/me/menus/:menuId')
  @ApiOperation({ summary: 'Delete a menu from the managed restaurant' })
  @ApiBearerAuth('access-token')
  @ApiResultResponse(HttpStatus.OK)
  @mongoIdParam('menuId')
  async deleteMenu(
    @Param('menuId', ParseObjectIdPipe) id: Types.ObjectId,
  ): Promise<Result<void>> {
    return this.menuService.deleteMenu(id);
  }

  @UseGuards(AccessAuthGuard, RoleGuard)
  @Roles(Role.RESTAURANT_ADMINISTRATOR)
  @HttpCode(HttpStatus.OK)
  @Get('restaurants/me/menus')
  @ApiOperation({ summary: 'List menus for the managed restaurant' })
  @ApiBearerAuth('access-token')
  @ApiResultResponse(HttpStatus.OK)
  async getMyMenus(
    @Query() pagination: PaginationQueryDTO,
  ): Promise<Result<IMenuResponse[]>> {
    return this.menuService.getMyMenus(pagination);
  }

  @UseGuards(AccessAuthGuard, RoleGuard)
  @Roles(Role.RESTAURANT_ADMINISTRATOR)
  @UseInterceptors(
    FileInterceptor('image', IMAGE_UPLOAD_OPTIONS),
    ParseStringifiedJsonInterceptor,
  )
  @HttpCode(HttpStatus.OK)
  @Put('restaurants/me/menus/:menuId')
  @ApiOperation({ summary: 'Update a menu for the managed restaurant' })
  @ApiBearerAuth('access-token')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        menuItemsIds: {
          type: 'string',
          description: 'JSON array of menu item ObjectIds',
        },
        image: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResultResponse(HttpStatus.OK)
  @mongoIdParam('menuId')
  async updateMenu(
    @Param('menuId', ParseObjectIdPipe) id: Types.ObjectId,
    @Body() props: UpdateMenuDTO,
    @UploadedFile() image: Express.Multer.File,
  ): Promise<Result<IMenuResponse>> {
    return this.menuService.updateMenu(props, id, image);
  }

  // public
  @Get('restaurants/:restaurantId/menus')
  @ApiOperation({ summary: 'List a restaurant’s public menus' })
  @ApiResultResponse(HttpStatus.OK)
  @mongoIdParam('restaurantId')
  async getRestaurantMenus(
    @Param('restaurantId', ParseObjectIdPipe) restaurantId: Types.ObjectId,
    @Query() pagination: PaginationQueryDTO,
  ): Promise<Result<IMenuResponse[]>> {
    return this.menuService.getRestaurantMenus(restaurantId, pagination);
  }

  @Get('restaurants/:restaurantId/menus/:menuId')
  @ApiOperation({ summary: 'Get a restaurant menu by ID' })
  @ApiResultResponse(HttpStatus.OK)
  @mongoIdParam('restaurantId')
  @mongoIdParam('menuId')
  async getMenuById(
    @Param('restaurantId', ParseObjectIdPipe) restaurantId: Types.ObjectId,
    @Param('menuId', ParseObjectIdPipe) id: Types.ObjectId,
  ): Promise<Result<IMenuResponse>> {
    return this.menuService.getRestaurantMenuById(restaurantId, id);
  }
}
