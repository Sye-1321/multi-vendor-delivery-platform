import { Types } from 'mongoose';
import { ICart } from './interfaces/cart-entity.interface';
import { CartItem } from 'src/cart-item/cartItem';
import { Audit } from 'src/domain/audit/audit';
import { Entity } from 'src/domain/entity/entity';
import { Result } from 'src/domain/result/result';

export class Cart extends Entity<ICart> implements ICart {
  _userId: Types.ObjectId;
  _totalPrice: number;
  _cartItems: CartItem[] | undefined;
  _audit: Audit;

  constructor(id: Types.ObjectId, props: ICart) {
    super(id);
    this._totalPrice = props.totalPrice;
    this._userId = props.userId;
    this._cartItems = props.cartItems;
    this._audit = props.audit;
  }

  get totalPrice(): number {
    return this._totalPrice;
  }

  set totalPrice(totalPrice: number) {
    this._totalPrice = totalPrice;
  }

  get userId(): Types.ObjectId {
    return this._userId;
  }

  set userId(userId: Types.ObjectId) {
    this._userId = userId;
  }

  get cartItems(): CartItem[] | undefined {
    return this._cartItems;
  }

  set cartItems(cartItems: CartItem[] | undefined) {
    this._cartItems = cartItems;
  }

  get audit(): Audit {
    return this._audit;
  }

  set audit(audit: Audit) {
    this._audit = audit;
  }

  static create(props: ICart, id?: Types.ObjectId): Result<Cart> {
    return Result.ok(new Cart(id ?? new Types.ObjectId(), props));
  }
}
