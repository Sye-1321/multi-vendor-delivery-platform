import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { MenuItemDataModel, MenuItemDocument } from './schemas/menu-item.schema';
import { IMenuItemRepository } from './interfaces/menu-item-repository';
import { GenericDocumentRepository } from 'src/infrastructure/database/mongoDB/generic-document.repository';
import { MenuItem } from 'src/menu-item/menu-item';
import { MenuItemMapper } from 'src/menu-item/menu-item.mapper';
import { Result } from 'src/domain/result/result';

@Injectable()
export class MenuItemRepository extends GenericDocumentRepository<MenuItem, MenuItemDocument> implements IMenuItemRepository{
  constructor(
    @InjectModel(MenuItemDataModel.name) menuItemModel: Model<MenuItemDocument>,
    @InjectConnection() connection: Connection,
    private readonly menuItemMapper: MenuItemMapper,
  ) {
    super(menuItemModel, connection, menuItemMapper);
  }

  async getMenuItemById(restaurantId:Types.ObjectId, id: Types.ObjectId): Promise<Result<MenuItem>> {
    const menuItemDocument = await this.DocumentModel.findOne({
      restaurantId: restaurantId, 
      _id: id,
    })
    if (!menuItemDocument) {
      return Result.fail('Error getting document from database', HttpStatus.NOT_FOUND);
    }
    const menuItem: MenuItem = this.menuItemMapper.toDomain(menuItemDocument);
    return Result.ok(menuItem);
  }

  async findMenuItemByName(
    restaurantId: Types.ObjectId,
    name: string
  ): Promise<Result<MenuItem>> {
    const menuItemDocument = await this.DocumentModel.findOne({
      restaurantId,
      name,
    }).exec();
  
    if (!menuItemDocument) {
      return Result.fail('Menu item not found for the specified restaurant and name', HttpStatus.NOT_FOUND);
    }
  
    const menuItem = this.menuItemMapper.toDomain(menuItemDocument);
    return Result.ok(menuItem);
  }
  
  async createMenuItem(menuItemModel: MenuItemDataModel): Promise<Result<MenuItem>> {
    const createdMenuItem = await this.DocumentModel.create(menuItemModel);
    if (!createdMenuItem) {
      return Result.fail('An error occurred, unable to save document in the DB', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    const menuItem: MenuItem = this.menuItemMapper.toDomain(createdMenuItem);
    return Result.ok(menuItem)
  }

  async deleteMenuItem(restaurantid:Types.ObjectId, id: Types.ObjectId): Promise<Result<void>> {
    const deleteResult = await this.DocumentModel.deleteOne({ _id: id, restaurantId: restaurantid }).exec();
    if (deleteResult.deletedCount === 0) {
      return Result.fail('Error deleting document from database', HttpStatus.NOT_FOUND);
    }
    return Result.ok(undefined, 'menuitem succesfully deleted');
  }

  async getMenuItems(restaurantId: Types.ObjectId): Promise<Result<MenuItem[]>> {
    const menuItems = await this.DocumentModel.find({ restaurantId }).exec();
    if (!menuItems) {
      return Result.fail('No menu items found for the specified restaurant', HttpStatus.NOT_FOUND);
    }
    const mappedMenuItems = menuItems.map((item) => this.menuItemMapper.toDomain(item));
    return Result.ok(mappedMenuItems);
  }

  async updateMenuItemById(
    restaurantId: Types.ObjectId,
    id: Types.ObjectId,
    updateData: Partial<MenuItemDataModel>
  ): Promise<Result<MenuItem>> {
    const updatedMenuItem = await this.DocumentModel.findOneAndUpdate(
      { _id: id, restaurantId }, 
      { $set: updateData },
      { new: true }
    ).exec();
  
    if (!updatedMenuItem) {
      return Result.fail('Error updating document in the database', HttpStatus.NOT_FOUND);
    }
  
    const updatedMenuItemDomain = this.menuItemMapper.toDomain(updatedMenuItem);
    return Result.ok(updatedMenuItemDomain);
  }
  

  async getMenuItemsByIds(
    itemIds: Types.ObjectId[]
  ): Promise<Result<MenuItem[]>> {
    const itemDocs = await this.DocumentModel.find({
      _id: { $in: itemIds },
    }).exec();
  
    if (!itemDocs?.length) {
      return Result.fail('No items found for the provided IDs', HttpStatus.NOT_FOUND);
    }
  
    const items = itemDocs.map((doc) => this.menuItemMapper.toDomain(doc));
    return Result.ok(items);
  }

}
