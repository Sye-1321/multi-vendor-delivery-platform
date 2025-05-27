import { Types } from 'mongoose';
import { IMenu } from './interfaces/menu.entity.interface';
import { Entity } from 'src/domain/entity/entity';
import { Audit } from 'src/domain/audit/audit';
import { Result } from 'src/domain/result/result';
import { MenuItem } from 'src/menu-item/menu-item';

export class Menu extends Entity<IMenu> implements IMenu {
  private _name: string;
  private _image: string;
  private _restaurantId: Types.ObjectId;
  private _menuItems: MenuItem[];
  private _audit: Audit;

  constructor(id: Types.ObjectId, props: IMenu) {
    super(id);
    this._name = props.name;
    this._image = props.image;
    this._restaurantId = props.restaurantId;
    this._menuItems = props.menuItems;
    this._audit = props.audit;
  }

  get name(): string {
    return this._name;
  }
  set name(name: string) {
    this._name = name;
  }

  get image(): string {
    return this._image;
  }
  set image(image: string) {
    this._image = image;
  }

  get restaurantId(): Types.ObjectId {
    return this._restaurantId;
  }
  set restaurantId(restaurantId: Types.ObjectId) {
    this._restaurantId = restaurantId;
  }

  get menuItems(): MenuItem[] {
    return this._menuItems;
  }
  set menuItems(menuItems: MenuItem[]) {
    this._menuItems = menuItems;
  }

  get audit(): Audit {
    return this._audit;
  }
  set audit(audit: Audit) {
    this._audit = audit;
  }

  static create(props: IMenu, id?: Types.ObjectId): Result<Menu> {
    return Result.ok(new Menu(id ?? new Types.ObjectId(), props));
  }
}
