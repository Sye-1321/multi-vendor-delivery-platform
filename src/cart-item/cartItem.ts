import { Types } from 'mongoose';
import { ICartItem } from './interfaces/cartItem-entity.interface';
import { Entity } from 'src/domain/entity/entity';
import { Audit } from 'src/domain/audit/audit';
import { Result } from 'src/domain/result/result';

export class CartItem extends Entity<ICartItem> implements ICartItem {
  _menuItemId: Types.ObjectId;
  _quantity: number;
  _subTotal: number;
  _customizations?: string;
  _audit: Audit;

  constructor(id: Types.ObjectId, props: ICartItem) {
    super(id);
    this._menuItemId = props.menuItemId;
    this._quantity = props.quantity;
    this._subTotal = props.subTotal;
    this._customizations = props.customizations;
    this._audit = props.audit;
  }

  get menuItemId(): Types.ObjectId {
    return this._menuItemId;
  }

  set menuItemId(menuItemId: Types.ObjectId) {
    this._menuItemId = menuItemId;
  }

  get quantity(): number {
    return this._quantity;
  }

  set quantity(quantity: number) {
    this._quantity = quantity;
  }

  get subTotal(): number {
    return this._subTotal;
  }

  set subTotal(subTotal: number) {
    this._subTotal = subTotal;
  }

  get customizations(): string | undefined {
    return this._customizations;
  }

  set customizations(customizations: string | undefined) {
    this._customizations = customizations;
  }

  get audit(): Audit {
    return this._audit;
  }

  set audit(audit: Audit) {
    this._audit = audit;
  }

  static create(props: ICartItem, id?: Types.ObjectId): Result<CartItem> {
    return Result.ok(new CartItem(id ?? new Types.ObjectId(), props));
  }
}
