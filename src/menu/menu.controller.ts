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

@Controller()
export class MenuController {
  constructor(
    @Inject(TYPES.IMenuService) private readonly menuService: IMenuService,
  ) {}

  @UseGuards(AccessAuthGuard, RoleGuard)
  @Roles(Role.RESTAURANT_ADMINISTRATOR)
  @UseInterceptors(FileInterceptor('image'), ParseStringifiedJsonInterceptor)
  @HttpCode(HttpStatus.CREATED)
  @Post('me/menus')
  async createMenu(
    @Body() props: CreateMenuDTO,
    @UploadedFile() image: Express.Multer.File,
  ): Promise<Result<IMenuResponse>> {
    return this.menuService.createMenu(props, image);
  }

  @UseGuards(AccessAuthGuard, RoleGuard)
  @Roles(Role.RESTAURANT_ADMINISTRATOR)
  @HttpCode(HttpStatus.OK)
  @Delete('me/menus/:id')
  async deleteMenu(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
  ): Promise<Result<void>> {
    return this.menuService.deleteMenu(id);
  }

  @UseGuards(AccessAuthGuard, RoleGuard)
  @Roles(Role.RESTAURANT_ADMINISTRATOR)
  @HttpCode(HttpStatus.OK)
  @Get('me/menus')
  async getMyMenus(): Promise<Result<IMenuResponse[]>> {
    return this.menuService.getMyMenus();
  }

  @UseGuards(AccessAuthGuard, RoleGuard)
  @Roles(Role.RESTAURANT_ADMINISTRATOR)
  @UseInterceptors(FileInterceptor('image'), ParseStringifiedJsonInterceptor)
  @HttpCode(HttpStatus.OK)
  @Put('me/menus/:id')
  async updateMenu(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @Body() props: UpdateMenuDTO,
    @UploadedFile() image: Express.Multer.File,
  ): Promise<Result<IMenuResponse>> {
    return this.menuService.updateMenu(props, id, image);
  }

  // public
  @Get(':restaurantId/menus')
  async getRestaurantMenus(
    @Param('restaurantId', ParseObjectIdPipe) restaurantId: Types.ObjectId,
  ): Promise<Result<IMenuResponse[]>> {
    return this.menuService.getRestaurantMenus(restaurantId);
  }

  @Get(':restaurantId/menus/:id')
  async getMenuById(
    @Param('restaurantId', ParseObjectIdPipe) restaurantId: Types.ObjectId,
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
  ): Promise<Result<IMenuResponse>> {
    return this.menuService.getRestaurantMenuById(restaurantId, id);
  }
}
