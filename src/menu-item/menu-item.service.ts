import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { TYPES } from './../application/constants/types';
import { Audit } from './../domain/audit/audit';
import { Result } from './../domain/result/result';
import { Context } from './../infrastructure/context/context';
import { MenuItemParser } from './menu-item.parser';
import { MenuItem } from './menu-item';
import { throwApplicationError } from './../infrastructure/utilities/exception-instance';
import { IMenuItemService } from './interfaces/menu-item-service.interface';
import { IContextService } from 'src/infrastructure/context/context-service.interface';
import { IMenuItemRepository } from 'src/infrastructure/data_access/repositories/interfaces/menu-item-repository';
import { IRestaurantService } from 'src/restaurant/interfaces/restaurant-service.interface';
import {
  CreateMenuItemDTO,
  UpdateMenuItemDTO,
} from './dtos/create-menu-item.dto';
import { IMenuItemResponse } from './interfaces/menu-item-response.interface';
import { MenuItemMapper } from './menu-item.mapper';
import {
  DeleteFileLocally,
  SaveFileLocally,
} from 'src/application/saveFileLocally';

@Injectable()
export class MenuItemService implements IMenuItemService {
  constructor(
    @Inject(TYPES.IContextService)
    private readonly contextService: IContextService,
    @Inject(TYPES.IMenuItemRepository)
    private readonly menuItemRepository: IMenuItemRepository,
    @Inject(TYPES.IRestaurantService)
    private readonly restaurantService: IRestaurantService,
    private readonly menuItemMapper: MenuItemMapper,
  ) {}

  private get context(): Context {
    return this.contextService.getContext();
  }

  private async getRestaurantIdForCurrentAdmin(): Promise<Types.ObjectId> {
    const restaurant = await this.restaurantService.getRestaurantByRAdmin();
    return restaurant.id;
  }

  async createMenuItem(
    props: CreateMenuItemDTO,
    image: Express.Multer.File,
  ): Promise<Result<IMenuItemResponse>> {
    if (!image) {
      throwApplicationError(HttpStatus.BAD_REQUEST, 'Image file is required');
    }

    const restaurantId = await this.getRestaurantIdForCurrentAdmin();
    const { name } = props;

    const existingMenuItem = await this.menuItemRepository.findMenuItemByName(
      restaurantId,
      name,
    );
    if (existingMenuItem.isSuccess) {
      throwApplicationError(
        HttpStatus.CONFLICT,
        `Menu item ${name} already exists`,
      );
    }

    const imageUrl = await SaveFileLocally(image, 'menu-item-covers');
    let persisted = false;
    try {
      const audit: Audit = Audit.createInsertContext(this.context);

      const menuItem: MenuItem = MenuItem.create(
        {
          restaurantId,
          ...props,
          audit,
          image: imageUrl,
        },
        new Types.ObjectId(),
      ).getValue();

      const menuItemModel = this.menuItemMapper.toPersistence(menuItem);
      const menuItemResult =
        await this.menuItemRepository.createMenuItem(menuItemModel);

      if (!menuItemResult.isSuccess) {
        throwApplicationError(
          HttpStatus.INTERNAL_SERVER_ERROR,
          'Menu item could not be created',
        );
      }
      persisted = true;

      const newMenuItem = menuItemResult.getValue();
      const response = await this.menuItemRepository.getMenuItemById(
        restaurantId,
        newMenuItem.id,
      );

      return Result.ok(
        MenuItemParser.createMenuItemResponse(response.getValue()),
        'Menu item created successfully',
      );
    } catch (error) {
      if (!persisted) await DeleteFileLocally(imageUrl);
      throw error;
    }
  }

  async updateMenuItem(
    id: Types.ObjectId,
    props: UpdateMenuItemDTO,
    imageFile?: Express.Multer.File,
  ): Promise<Result<IMenuItemResponse>> {
    const restaurant = await this.restaurantService.getRestaurantByRAdmin();
    const restaurantId = restaurant.id;

    const menuItemResult = await this.menuItemRepository.getMenuItemById(
      restaurantId,
      id,
    );
    if (!menuItemResult.isSuccess) {
      throwApplicationError(HttpStatus.NOT_FOUND, 'Menu item not found');
    }

    const menuItem = menuItemResult.getValue();
    const oldImage = menuItem.image;
    const data: any = {
      ...props,
    };

    let newImage: string | undefined;
    try {
      if (imageFile) {
        newImage = await SaveFileLocally(imageFile, 'menu-item-covers');
        data.image = newImage;
      }

      this.updateMenuItemData(data, menuItem);
      menuItem.audit = Audit.updateContext(this.context.email, menuItem);

      const updatedModel = this.menuItemMapper.toPersistence(menuItem);
      const result = await this.menuItemRepository.updateMenuItemById(
        restaurantId,
        id,
        updatedModel,
      );
      if (!result.isSuccess) {
        throwApplicationError(
          HttpStatus.INTERNAL_SERVER_ERROR,
          'Menu item update failed',
        );
      }
    } catch (error) {
      await DeleteFileLocally(newImage);
      throw error;
    }

    if (newImage) await DeleteFileLocally(oldImage);

    const updatedMenuItem = await this.menuItemRepository.getMenuItemById(
      restaurantId,
      id,
    );
    return Result.ok(
      MenuItemParser.createMenuItemResponse(updatedMenuItem.getValue()),
      'Menu item updated successfully',
    );
  }

  async deleteMenuItem(id: Types.ObjectId): Promise<Result<void>> {
    const restaurant = await this.restaurantService.getRestaurantByRAdmin();
    const restaurantId = restaurant.id;

    const existingMenuItem = await this.menuItemRepository.getMenuItemById(
      restaurantId,
      id,
    );
    if (!existingMenuItem.isSuccess) {
      throwApplicationError(HttpStatus.NOT_FOUND, 'Menu item not found');
    }

    const result = await this.menuItemRepository.deleteMenuItem(
      restaurantId,
      id,
    );
    if (!result.isSuccess) {
      throwApplicationError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Menu item could not be deleted',
      );
    }

    await DeleteFileLocally(existingMenuItem.getValue().image);

    return Result.ok(undefined, 'Menu item deleted successfully');
  }

  async getMenuItems(): Promise<Result<IMenuItemResponse[]>> {
    const restaurant = await this.restaurantService.getRestaurantByRAdmin();
    const restaurantId = restaurant.id;
    const result = await this.menuItemRepository.getMenuItems(restaurantId);
    if (!result.isSuccess) {
      throwApplicationError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Could not retrieve menu items',
      );
    }
    const data = MenuItemParser.createMenuItemsResponse(result.getValue());
    const message =
      data.length === 0
        ? 'No menu items found for the specified restaurant'
        : 'Menu items retrieved successfully';

    return Result.ok(data, message);
  }

  async getMenuItemById(
    id: Types.ObjectId,
  ): Promise<Result<IMenuItemResponse>> {
    const restaurant = await this.restaurantService.getRestaurantByRAdmin();
    const restaurantId = restaurant.id;
    const menuItem = await this.menuItemRepository.getMenuItemById(
      restaurantId,
      id,
    );
    if (!menuItem.isSuccess) {
      throwApplicationError(HttpStatus.NOT_FOUND, 'Menu item not found');
    }
    return Result.ok(
      MenuItemParser.createMenuItemResponse(menuItem.getValue()),
      'Menu item retrieved successfully',
    );
  }

  async getRestaurantMenuItems(
    restaurantId: Types.ObjectId,
  ): Promise<Result<IMenuItemResponse[]>> {
    const result = await this.menuItemRepository.getMenuItems(restaurantId);
    if (!result.isSuccess) {
      throwApplicationError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Could not retrieve menu items',
      );
    }
    return Result.ok(
      MenuItemParser.createMenuItemsResponse(result.getValue()),
      'Menu items retrieved successfully',
    );
  }

  async getRestaurantMenuItemById(
    restaurantId: Types.ObjectId,
    id: Types.ObjectId,
  ): Promise<Result<IMenuItemResponse>> {
    const menuItemResult = await this.menuItemRepository.getMenuItemById(
      restaurantId,
      id,
    );
    if (!menuItemResult.isSuccess) {
      throwApplicationError(HttpStatus.NOT_FOUND, 'Menu item not found');
    }
    return Result.ok(
      MenuItemParser.createMenuItemResponse(menuItemResult.getValue()),
      'Menu item retrieved successfully',
    );
  }

  async getMenuItemsByIds(
    restaurantId: Types.ObjectId,
    itemIds: Types.ObjectId[],
  ): Promise<MenuItem[]> {
    const uniqueItemCount = new Set(itemIds.map((id) => id.toString())).size;
    const result = await this.menuItemRepository.getMenuItemsByIds(
      restaurantId,
      itemIds,
    );

    if (!result.isSuccess) {
      throwApplicationError(
        HttpStatus.BAD_REQUEST,
        'One or more menu items are not available to this restaurant.',
      );
    }

    const menuItems = result.getValue();
    if (menuItems.length !== uniqueItemCount) {
      throwApplicationError(
        HttpStatus.BAD_REQUEST,
        'One or more menu items are not available to this restaurant.',
      );
    }

    return menuItems;
  }

  private updateMenuItemData(data: any, menuItem: MenuItem): void {
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && key in menuItem) {
        (menuItem as any)[key] = value;
      }
    });
  }
}
