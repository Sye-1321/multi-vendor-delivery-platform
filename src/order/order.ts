import { Types } from 'mongoose';
import { Cart } from 'src/cart/cart';
import {
  ISavedAddress,
  IOrder,
  IOrderTransition,
} from './interfaces/order.interface';
import { Entity } from 'src/domain/entity/entity';
import { OrderStatus, PaymentStatus } from './constants/constants';
import { DeliveryPerson } from 'src/delivery-person/delivery-person';
import { Audit } from 'src/domain/audit/audit';
import { Result } from 'src/domain/result/result';

export class Order extends Entity<IOrder> {
  private _userId: Types.ObjectId;
  private _restaurantId: Types.ObjectId;
  private _cart: Cart;
  private _deliveryAddress: ISavedAddress;
  private _status: OrderStatus;
  private _totalPrice: number;
  private _paymentStatus: PaymentStatus;
  private _deliveryPerson: DeliveryPerson | null;
  private _deliveryPersonId: Types.ObjectId | null;
  private readonly _timeline: IOrderTransition[];
  private _audit: Audit;

  constructor(id: Types.ObjectId, props: IOrder) {
    super(id);
    this._userId = props.userId;
    this._restaurantId = props.restaurantId;
    this._cart = props.cart;
    this._deliveryAddress = props.deliveryAddress;
    this._status = props.status;
    this._totalPrice = props.totalPrice;
    this._paymentStatus = props.paymentStatus;
    this._deliveryPerson = props.deliveryPerson ?? null;
    this._deliveryPersonId = props.deliveryPersonId ?? null;
    this._timeline = props.timeline ?? [];
    this._audit = props.audit;
  }

  get userId(): Types.ObjectId {
    return this._userId;
  }

  set userId(userId: Types.ObjectId) {
    this._userId = userId;
  }

  get restaurantId(): Types.ObjectId {
    return this._restaurantId;
  }

  set restaurantId(restaurantId: Types.ObjectId) {
    this._restaurantId = restaurantId;
  }

  get cart(): Cart {
    return this._cart;
  }

  set cart(cart: Cart) {
    this._cart = cart;
  }

  get deliveryAddress(): ISavedAddress {
    return this._deliveryAddress;
  }

  set deliveryAddress(deliveryAddress: ISavedAddress) {
    this._deliveryAddress = deliveryAddress;
  }

  get status(): OrderStatus {
    return this._status;
  }

  set status(status: OrderStatus) {
    this._status = status;
  }

  get totalPrice(): number {
    return this._totalPrice;
  }

  set totalPrice(totalPrice: number) {
    this._totalPrice = totalPrice;
  }

  get paymentStatus(): PaymentStatus {
    return this._paymentStatus;
  }

  set paymentStatus(paymentStatus: PaymentStatus) {
    this._paymentStatus = paymentStatus;
  }

  get deliveryPerson(): DeliveryPerson | null {
    return this._deliveryPerson;
  }

  set deliveryPerson(deliveryPerson: DeliveryPerson | null) {
    this._deliveryPerson = deliveryPerson;
  }

  get deliveryPersonId(): Types.ObjectId | null {
    return this._deliveryPersonId;
  }

  set deliveryPersonId(deliveryPersonId: Types.ObjectId | null) {
    this._deliveryPersonId = deliveryPersonId;
  }

  get timeline(): readonly IOrderTransition[] {
    return this._timeline;
  }

  get audit(): Audit {
    return this._audit;
  }

  set audit(audit: Audit) {
    this._audit = audit;
  }

  static create(props: IOrder, id?: Types.ObjectId): Result<Order> {
    return Result.ok(new Order(id ?? new Types.ObjectId(), props));
  }
}
