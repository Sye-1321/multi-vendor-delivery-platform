import { Types } from 'mongoose';
import { Audit } from 'src/domain/audit/audit';
import { Entity } from 'src/domain/entity/entity';
import { User } from 'src/user/user';
import { ICompany, ISavedAddress } from './interfaces/company.interface';
import { Result } from 'src/domain/result/result';

export class Company extends Entity<ICompany> {
  private _logo: string;
  private _name: string;
  private _phoneNumber: string;
  private _ownerId: Types.ObjectId;
  private _audit: Audit;
  private _owner: User;
  private _savedAddress: ISavedAddress;

  constructor(id: Types.ObjectId, props: ICompany) {
    super(id);
    this._logo = props.logo;
    this._name = props.name;
    this._phoneNumber = props.phoneNumber;
    this._ownerId = props.ownerId;
    this._audit = props.audit;
    this._owner = props.owner;
    this._savedAddress = props.savedAddress;
  }

  get logo(): string {
    return this._logo;
  }

  set logo(logo: string) {
    this._logo = logo;
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

  get ownerId(): Types.ObjectId {
    return this._ownerId;
  }

  set ownerId(ownerId: Types.ObjectId) {
    this._ownerId = ownerId;
  }

  get owner(): User {
    return this._owner;
  }

  set owner(owner: User) {
    this._owner = owner;
  }

  get audit(): Audit {
    return this._audit;
  }

  set audit(audit: Audit) {
    this._audit = audit;
  }

  get savedAddress(): ISavedAddress {
    return this._savedAddress;
  }

  set savedAddress(address: ISavedAddress) {
    this._savedAddress = address;
  }

  static create(props: ICompany, id?: Types.ObjectId): Result<Company> {
    return Result.ok(new Company(id ?? new Types.ObjectId(), props));
  }
}
