import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { Types, Connection } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';
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
import { SaveFileLocally } from 'src/application/saveFileLocally';
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
    @InjectConnection() private readonly connection: Connection,
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

    const session = await this.connection.startSession();
    let committed = false;

    try {
      session.startTransaction();
      const restaurantId = await this.getRestaurantIdForCurrentAdmin();
      const { name, menuItemsIds } = props;

      const exists = await this.menuRepository.findMenuByName(
        restaurantId,
        name,
      );
      if (exists.isSuccess) {
        throwApplicationError(
          HttpStatus.BAD_REQUEST,
          `Menu ${name} already exists`,
        );
      }

      const imageUrl = await SaveFileLocally(image, 'menu-covers');
      const context = this.contextService.getContext();
      const audit = Audit.createInsertContext(context);

      let menuItems: MenuItem[] = [];
      if (menuItemsIds?.length) {
        menuItems = await this.menuItemService.getMenuItemsByIds(menuItemsIds);
      }

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

      await session.commitTransaction();
      committed = true;

      const saved = await this.menuRepository.getMenuById(
        restaurantId,
        createResult.getValue().id,
      );
      const response = MenuParser.createMenuResponse(saved.getValue());
      return Result.ok(response, 'Menu created successfully');
    } catch (err) {
      if (!committed) {
        await session.abortTransaction();
      }
      console.error(err);
      return Result.fail('Menu creation failed', HttpStatus.EXPECTATION_FAILED);
    } finally {
      await session.endSession();
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
      throwApplicationError(HttpStatus.BAD_REQUEST, 'Menu not found');
    }
    const response = MenuParser.createMenuResponse(found.getValue());
    return Result.ok(response);
  }

  async updateMenu(
    props: UpdateMenuDTO,
    id: Types.ObjectId,
    image?: Express.Multer.File,
  ): Promise<Result<IMenuResponse>> {
    try {
      const restaurantId = await this.getRestaurantIdForCurrentAdmin();
      const existing = await this.menuRepository.getMenuById(restaurantId, id);
      if (!existing.isSuccess) {
        throwApplicationError(HttpStatus.BAD_REQUEST, 'Menu not found');
      }

      const entity = existing.getValue();
      const context = this.contextService.getContext();

      const data: any = {
        auditModifiedBy: context.email,
        auditModifiedDateTime: new Date().toISOString(),
        ...props,
      };

      if (image) {
        data.image = await SaveFileLocally(image, 'menu-covers');
      }

      if (props.menuItemsIds?.length) {
        data.menuItems = await this.menuItemService.getMenuItemsByIds(
          props.menuItemsIds,
        );
      }

      Object.assign(entity, data);
      Audit.updateContext(context.email, entity);

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

      const saved = await this.menuRepository.getMenuById(restaurantId, id);
      const response = MenuParser.createMenuResponse(saved.getValue());
      return Result.ok(response, 'Menu updated successfully');
    } catch (err) {
      console.error(err);
      return Result.fail('Menu update failed', HttpStatus.EXPECTATION_FAILED);
    }
  }

  async deleteMenu(id: Types.ObjectId): Promise<Result<void>> {
    const restaurantId = await this.getRestaurantIdForCurrentAdmin();
    const exists = await this.menuRepository.getMenuById(restaurantId, id);
    if (!exists.isSuccess) {
      throwApplicationError(HttpStatus.BAD_REQUEST, 'Menu not found');
    }
    const del = await this.menuRepository.deleteMenu(restaurantId, id);
    if (!del.isSuccess) {
      throwApplicationError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Failed to delete menu',
      );
    }
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
      throwApplicationError(HttpStatus.BAD_REQUEST, 'Menu not found');
    }
    const response = MenuParser.createMenuResponse(found.getValue());
    return Result.ok(response);
  }
}
