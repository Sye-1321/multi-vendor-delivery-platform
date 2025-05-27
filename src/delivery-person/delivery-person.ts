import { Types } from 'mongoose';
import { IDeliveryPerson, ISavedAddress } from './interfaces/deliveryperson.interface';
import { AvailabilityStatus, DeliveryPersonOwnership, DeliveryPersonStatus } from './constants/constants';
import { Entity } from 'src/domain/entity/entity';
import { Audit } from 'src/domain/audit/audit';
import { Result } from 'src/domain/result/result';

export class DeliveryPerson extends Entity<IDeliveryPerson> {
  private _profileImage: string;
  private _name: string;
  private _phoneNumber: string;
  private _availabilityStatus: AvailabilityStatus;
  private _status: DeliveryPersonStatus;
  private _deliveryType: DeliveryPersonOwnership;
  private _restaurantId?: Types.ObjectId;
  private _savedAddress: ISavedAddress;
  private _audit: Audit;

  constructor(id: Types.ObjectId, props: IDeliveryPerson) {
    super(id);
    this._profileImage = props.profileImage;
    this._name = props.name;
    this._phoneNumber = props.phoneNumber;
    this._availabilityStatus = props.availabilityStatus;
    this._status = props.status;
    this._deliveryType = props.deliveryType;
    this._restaurantId = props.restaurantId;
    this._savedAddress = props.savedAddress;
    this._audit = props.audit;
  }

  get profileImage(): string {
    return this._profileImage;
  }

  set profileImage(image: string) {
    this._profileImage = image;
  }

  get name(): string {
    return this._name;
  }

  set name(name: string) {
    this._name = name;
  }

  get phoneNumber(): string {
    return this._phoneNumber;
  }

  set phoneNumber(phoneNumber: string) {
    this._phoneNumber = phoneNumber;
  }

  get availabilityStatus(): AvailabilityStatus {
    return this._availabilityStatus;
  }

  set availabilityStatus(status: AvailabilityStatus) {
    this._availabilityStatus = status;
  }

  get status(): DeliveryPersonStatus {
    return this._status;
  }

  set status(status: DeliveryPersonStatus) {
    this._status = status;
  }

  get deliveryType(): DeliveryPersonOwnership {
    return this._deliveryType;
  }

  set deliveryType(type: DeliveryPersonOwnership) {
    this._deliveryType = type;
  }

  get restaurantId(): Types.ObjectId | undefined {
    return this._restaurantId;
  }

  set restaurantId(id: Types.ObjectId | undefined) {
    this._restaurantId = id;
  }

  get savedAddress(): ISavedAddress {
    return this._savedAddress;
  }

  set savedAddress(address: ISavedAddress) {
    this._savedAddress = address;
  }

  get audit(): Audit {
    return this._audit;
  }

  set audit(audit: Audit) {
    this._audit = audit;
  }

  static create(props: IDeliveryPerson, id?: Types.ObjectId): Result<DeliveryPerson> {
    return Result.ok(new DeliveryPerson(id ?? new Types.ObjectId(), props));
  }

  update(props: Partial<IDeliveryPerson>) {
    if (props.profileImage !== undefined) {
      this._profileImage = props.profileImage;
    }
    if (props.name !== undefined) {
      this._name = props.name;
    }
    if (props.phoneNumber !== undefined) {
      this._phoneNumber = props.phoneNumber;
    }
    if (props.availabilityStatus !== undefined) {
      this._availabilityStatus = props.availabilityStatus;
    }
    if (props.status !== undefined) {
      this._status = props.status;
    }
    if (props.deliveryType !== undefined) {
      this._deliveryType = props.deliveryType;
    }
    if (props.restaurantId !== undefined) {
      this._restaurantId = props.restaurantId;
    }
    if (props.savedAddress !== undefined) {
      this._savedAddress = props.savedAddress;
    }
    if (props.audit !== undefined) {
      this._audit = props.audit;
    }
  }
}
