import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { TYPES } from '../application/constants/types';
import { Audit } from '../domain/audit/audit';
import { Result } from '../domain/result/result';
import { throwApplicationError } from '../infrastructure/utilities/exception-instance';
import { IContextService } from 'src/infrastructure/context/context-service.interface';
import { IMenuRepository } from 'src/infrastructure/data_access/repositories/interfaces/menu-repository.interface';
import { IMenuItemService } from 'src/menu-item/interfaces/menu-item-service.interface';
import { IRestaurantService } from 'src/restaurant/interfaces/restaurant-service.interface';
import { MenuMapper } from './menu.mapper';
import { MenuParser } from './menu.parser';
import { Menu } from './menu';
import {
  DeleteFileLocally,
  SaveFileLocally,
} from 'src/application/saveFileLocally';
import { IMenuService } from './interfaces/menu-service.interface';
import { MenuItem } from 'src/menu-item/menu-item';
import { IMenuResponse } from './interfaces/menu-reponse.interface';
import { CreateMenuDTO, UpdateMenuDTO } from './dtos/menu.dto';
import { APIResponseMessage } from 'src/application/constants/constants';

@Injectable()
export class MenuService implements IMenuService {
  constructor(
    @Inject(TYPES.IContextService)
    private readonly contextService: IContextService,
    @Inject(TYPES.IMenuRepository)
    private readonly menuRepository: IMenuRepository,
    @Inject(TYPES.IMenuItemService)
    private readonly menuItemService: IMenuItemService,
    @Inject(TYPES.IRestaurantService)
    private readonly restaurantService: IRestaurantService,
    private readonly menuMapper: MenuMapper,
  ) {}

  private async getRestaurantIdForCurrentAdmin(): Promise<Types.ObjectId> {
    const restaurant = await this.restaurantService.getRestaurantByRAdmin();
    return restaurant.id;
  }

  async getMyMenus(): Promise<Result<IMenuResponse[]>> {
    const restaurantId = await this.getRestaurantIdForCurrentAdmin();
    const result =
      await this.menuRepository.getMenusByRestaurantId(restaurantId);
    if (!result.isSuccess) {
      throwApplicationError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        APIResponseMessage.serverError,
      );
    }
    const data = MenuParser.createMenusResponse(result.getValue());
    const message =
      data.length === 0
        ? 'No menus found for the specified restaurant'
        : 'Menus retrieved successfully';

    return Result.ok(data, message);
  }

  async createMenu(
    props: CreateMenuDTO,
    image: Express.Multer.File,
  ): Promise<Result<IMenuResponse>> {
    if (!image) {
      throwApplicationError(HttpStatus.BAD_REQUEST, 'Menu image is required');
    }

    const restaurantId = await this.getRestaurantIdForCurrentAdmin();
    const { name, menuItemsIds } = props;

    const exists = await this.menuRepository.findMenuByName(restaurantId, name);
    if (exists.isSuccess) {
      throwApplicationError(HttpStatus.CONFLICT, `Menu ${name} already exists`);
    }

    let menuItems: MenuItem[] = [];
    if (menuItemsIds?.length) {
      menuItems = await this.menuItemService.getMenuItemsByIds(
        restaurantId,
        menuItemsIds,
      );
    }

    const imageUrl = await SaveFileLocally(image, 'menu-covers');
    let persisted = false;
    try {
      const context = this.contextService.getContext();
      const audit = Audit.createInsertContext(context);

      const menuEntity = Menu.create({
        restaurantId,
        name,
        image: imageUrl,
        menuItems,
        audit,
      }).getValue();

      const model = this.menuMapper.toPersistence(menuEntity);
      const createResult = await this.menuRepository.createMenu(model);
      if (!createResult.isSuccess) {
        throwApplicationError(
          HttpStatus.INTERNAL_SERVER_ERROR,
          'Failed to create menu',
        );
      }
      persisted = true;

      const saved = await this.menuRepository.getMenuById(
        restaurantId,
        createResult.getValue().id,
      );
      const response = MenuParser.createMenuResponse(saved.getValue());
      return Result.ok(response, 'Menu created successfully');
    } catch (error) {
      if (!persisted) await DeleteFileLocally(imageUrl);
      throw error;
    }
  }

  async getMenus(): Promise<Result<IMenuResponse[]>> {
    const restaurantId = await this.getRestaurantIdForCurrentAdmin();
    const result =
      await this.menuRepository.getMenusByRestaurantId(restaurantId);
    if (!result.isSuccess) {
      return Result.fail(
        'Failed to fetch menus',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    const list = result
      .getValue()
      .map((menu) => MenuParser.createMenuResponse(menu));
    return Result.ok(list);
  }

  async getMenuById(id: Types.ObjectId): Promise<Result<IMenuResponse>> {
    const restaurantId = await this.getRestaurantIdForCurrentAdmin();
    const found = await this.menuRepository.getMenuById(restaurantId, id);
    if (!found.isSuccess) {
      throwApplicationError(HttpStatus.NOT_FOUND, 'Menu not found');
    }
    const response = MenuParser.createMenuResponse(found.getValue());
    return Result.ok(response);
  }

  async updateMenu(
    props: UpdateMenuDTO,
    id: Types.ObjectId,
    image?: Express.Multer.File,
  ): Promise<Result<IMenuResponse>> {
    const restaurantId = await this.getRestaurantIdForCurrentAdmin();
    const existing = await this.menuRepository.getMenuById(restaurantId, id);
    if (!existing.isSuccess) {
      throwApplicationError(HttpStatus.NOT_FOUND, 'Menu not found');
    }

    const entity = existing.getValue();
    const oldImage = entity.image;
    const context = this.contextService.getContext();
    const { menuItemsIds, ...menuUpdates } = props;

    const data: any = {
      ...menuUpdates,
    };

    if (menuItemsIds !== undefined) {
      data.menuItems = menuItemsIds.length
        ? await this.menuItemService.getMenuItemsByIds(
            restaurantId,
            menuItemsIds,
          )
        : [];
    }

    let newImage: string | undefined;
    try {
      if (image) {
        newImage = await SaveFileLocally(image, 'menu-covers');
        data.image = newImage;
      }

      Object.assign(entity, data);
      entity.audit = Audit.updateContext(context.email, entity);

      const model = this.menuMapper.toPersistence(entity);
      const update = await this.menuRepository.updateMenuById(
        restaurantId,
        id,
        model,
      );
      if (!update.isSuccess) {
        throwApplicationError(
          HttpStatus.INTERNAL_SERVER_ERROR,
          'Failed to update menu',
        );
      }
    } catch (error) {
      await DeleteFileLocally(newImage);
      throw error;
    }

    if (newImage) await DeleteFileLocally(oldImage);

    const saved = await this.menuRepository.getMenuById(restaurantId, id);
    const response = MenuParser.createMenuResponse(saved.getValue());
    return Result.ok(response, 'Menu updated successfully');
  }

  async deleteMenu(id: Types.ObjectId): Promise<Result<void>> {
    const restaurantId = await this.getRestaurantIdForCurrentAdmin();
    const exists = await this.menuRepository.getMenuById(restaurantId, id);
    if (!exists.isSuccess) {
      throwApplicationError(HttpStatus.NOT_FOUND, 'Menu not found');
    }
    const del = await this.menuRepository.deleteMenu(restaurantId, id);
    if (!del.isSuccess) {
      throwApplicationError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Failed to delete menu',
      );
    }
    await DeleteFileLocally(exists.getValue().image);
    return Result.ok(undefined, 'Menu deleted successfully');
  }

  async getRestaurantMenus(
    restaurantId: Types.ObjectId,
  ): Promise<Result<IMenuResponse[]>> {
    const result =
      await this.menuRepository.getMenusByRestaurantId(restaurantId);
    const list = result
      .getValue()
      .map((menu) => MenuParser.createMenuResponse(menu));
    return Result.ok(list);
  }

  async getRestaurantMenuById(
    restaurantId: Types.ObjectId,
    id: Types.ObjectId,
  ): Promise<Result<IMenuResponse>> {
    const found = await this.menuRepository.getMenuById(restaurantId, id);
    if (!found.isSuccess) {
      throwApplicationError(HttpStatus.NOT_FOUND, 'Menu not found');
    }
    const response = MenuParser.createMenuResponse(found.getValue());
    return Result.ok(response);
  }
}
