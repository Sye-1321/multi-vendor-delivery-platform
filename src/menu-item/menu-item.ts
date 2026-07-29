import { Types } from 'mongoose';
import { Entity } from 'src/domain/entity/entity';
import { IMenuItem } from './interfaces/menu-item.entity.interface';
import { Audit } from 'src/domain/audit/audit';
import { Result } from 'src/domain/result/result';

export class MenuItem extends Entity<IMenuItem> {
  private _name: string;
  private _image: string;
  private _description?: string;
  private _price: number;
  private _availability: boolean;
  private _restaurantId: Types.ObjectId;
  private _audit: Audit;

  constructor(id: Types.ObjectId, props: IMenuItem) {
    super(id);
    this._name = props.name;
    this._image = props.image;
    this._description = props.description;
    this._price = props.price;
    this._availability = props.availability;
    this._restaurantId = props.restaurantId;
    this._audit = props.audit;
  }

  get restaurantId(): Types.ObjectId {
    return this._restaurantId;
  }

  set restaurantId(restaurantId: Types.ObjectId) {
    this._restaurantId = restaurantId;
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

  get description(): string | undefined {
    return this._description;
  }

  set description(description: string | undefined) {
    this._description = description;
  }

  get price(): number {
    return this._price;
  }

  set price(price: number) {
    this._price = price;
  }

  get availability(): boolean {
    return this._availability;
  }

  set availability(availability: boolean) {
    this._availability = availability;
  }

  get audit(): Audit {
    return this._audit;
  }

  set audit(audit: Audit) {
    this._audit = audit;
  }

  static create(props: IMenuItem, id?: Types.ObjectId): Result<MenuItem> {
    return Result.ok(new MenuItem(id ?? new Types.ObjectId(), props));
  }
}
