import { Types } from 'mongoose';
import { UserStatus } from './constants/constants';
import { IUser, ISavedAddress } from './interfaces/user.interface';
import { Entity } from 'src/domain/entity/entity';
import { Role } from 'src/application/constants/constants';
import { Audit } from 'src/domain/audit/audit';
import { Result } from 'src/domain/result/result';

export class User extends Entity<IUser> {
  private _name: string;
  private _email: string;
  private _phoneNumber: string;
  private _passwordHash: string;
  private _role: Role;
  private _status: UserStatus;
  private _refreshTokenHash?: string;
  private _audit: Audit;
  private _savedAddress: ISavedAddress = { city: '', subCity: '' };

  constructor(id: Types.ObjectId, props: IUser) {
    super(id);
    this._name = props.name;
    this._email = props.email;
    this._phoneNumber = props.phoneNumber;
    this._passwordHash = props.passwordHash;
    this._role = props.role;
    this._status = props.status ?? UserStatus.PENDING; 
    this._refreshTokenHash = props.refreshTokenHash;
    this._audit = props.audit;
    this._savedAddress = props.savedAddress ?? { city: '', subCity: '' };
  }

  get name(): string {
    return this._name;
  }

  set name(name: string) {
    this._name = name;
  }

  get email(): string {
    return this._email;
  }

  set email(email: string) {
    this._email = email;
  }

  get phoneNumber(): string {
    return this._phoneNumber;
  }

  set phoneNumber(phoneNumber: string) {
    this._phoneNumber = phoneNumber;
  }

  get passwordHash(): string {
    return this._passwordHash;
  }

  set passwordHash(passwordHash: string) {
    this._passwordHash = passwordHash;
  }

  get role(): Role {
    return this._role;
  }

  set role(role: Role) {
    this._role = role;
  }

  get status(): UserStatus {
    return this._status;
  }

  set status(status: UserStatus) {
    this._status = status;
  }

  get audit(): Audit {
    return this._audit;
  }

  set audit(audit: Audit) {
    this._audit = audit;
  }

  get refreshTokenHash(): string | undefined {
    return this._refreshTokenHash;
  }

  set refreshTokenHash(refreshTokenHash: string | undefined) {
    this._refreshTokenHash = refreshTokenHash;
  }

  get savedAddress(): ISavedAddress | undefined {
    return this._savedAddress;
  }
  
  set savedAddress(savedAddress: ISavedAddress) {
    this._savedAddress = savedAddress;
  }

  static create(props: IUser, id?: Types.ObjectId): Result<User> {
    return Result.ok(new User(id ?? new Types.ObjectId(), props));
  }

  update(props: Partial<IUser>) {
    if (props.refreshTokenHash) this._refreshTokenHash = props.refreshTokenHash;
  }
}
