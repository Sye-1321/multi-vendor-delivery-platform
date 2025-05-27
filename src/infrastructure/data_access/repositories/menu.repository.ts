import { Injectable, HttpStatus } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection, Types } from 'mongoose';
import { MenuMapper } from 'src/menu/menu.mapper';
import { MenuDataModel, MenuDocument } from 'src/infrastructure/data_access/repositories/schemas/menu.schema';
import { Menu } from 'src/menu/menu';
import { GenericDocumentRepository } from 'src/infrastructure/database/mongoDB/generic-document.repository';
import { Result } from 'src/domain/result/result';

@Injectable()
export class MenuRepository extends GenericDocumentRepository<Menu, MenuDocument> {
  constructor(
    @InjectModel(MenuDataModel.name) menuModel: Model<MenuDocument>,
    @InjectConnection() connection: Connection,
    private readonly menuMapper: MenuMapper,
  ) {
    super(menuModel, connection, menuMapper);
  }

  async getMenuById(restaurantId: Types.ObjectId, id: Types.ObjectId): Promise<Result<Menu>> {
    const menuDocument = await this.DocumentModel.findOne({ restaurantId, _id: id })
      .populate('menuItems')
      .exec();
    
    if (!menuDocument) {
      return Result.fail('Error getting menu from database', HttpStatus.NOT_FOUND);
    }

    const menu = this.menuMapper.toDomain(menuDocument);
    return Result.ok(menu);
  }

    async findMenuByName(
      restaurantId: Types.ObjectId,
      name: string
    ): Promise<Result<Menu>> {
      const menuDocument = await this.DocumentModel.findOne({
        restaurantId,
        name,
      }).exec();
    
      if (!menuDocument) {
        return Result.fail('Menu  not found for the specified restaurant and name', HttpStatus.NOT_FOUND);
      }
    
      const menu = this.menuMapper.toDomain(menuDocument);
      return Result.ok(menu);
    }

  async createMenu(menuData: MenuDataModel): Promise<Result<Menu>> {
    const createdMenu = await this.DocumentModel.create(menuData);

    if (!createdMenu) {
      return Result.fail('An error occurred, unable to save menu in the database', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const menu = this.menuMapper.toDomain(createdMenu);
    return Result.ok(menu);
  }

  async deleteMenu(restaurantId: Types.ObjectId, id: Types.ObjectId): Promise<Result<void>> {
    const deleteResult = await this.DocumentModel.deleteOne({ _id: id, restaurantId }).exec();

    if (deleteResult.deletedCount === 0) {
      return Result.fail('Error deleting menu from database', HttpStatus.NOT_FOUND);
    }

    return Result.ok(undefined, 'Menu successfully deleted');
  }

  async getMenusByRestaurantId(restaurantId: Types.ObjectId): Promise<Result<Menu[]>> {
    const menus = await this.DocumentModel.find({ restaurantId })
      .populate('menuItems')
      .exec();
    if (!menus) {
      return Result.fail('No menus found for the specified restaurant', HttpStatus.NOT_FOUND);
    }
    const mappedMenus = menus.map((doc) => this.menuMapper.toDomain(doc));
    return Result.ok(mappedMenus);
  }

  async updateMenuById(
    restaurantId: Types.ObjectId,
    id: Types.ObjectId,
    updateData: Partial<MenuDataModel>
  ): Promise<Result<Menu>> {
    const updatedMenu = await this.DocumentModel.findOneAndUpdate(
      { _id: id, restaurantId },
      { $set: updateData },
      { new: true }
    )
    .populate('menuItems')
    .exec();

    if (!updatedMenu) {
      return Result.fail('Error updating menu in database', HttpStatus.NOT_FOUND);
    }

    const menu = this.menuMapper.toDomain(updatedMenu);
    return Result.ok(menu);
  }


}
