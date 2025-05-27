import { Types } from 'mongoose';
import { IRestaurant } from './interfaces/restuarant.interface';
import { Entity } from 'src/domain/entity/entity';
import { Company } from 'src/company/company';
import { User } from 'src/user/user';
import { RestaurantStatus } from './constants/constants';
import { Audit } from 'src/domain/audit/audit';
import { Result } from 'src/domain/result/result';
import { Menu } from 'src/menu/menu';
import { RestaurantReview } from 'src/restuarant-review/restaurant-review';

export class Restaurant extends Entity<IRestaurant> {
  private _name: string;
  private _description?: string;
  private _savedAddress: { city: string; subCity: string };
  private _phoneNumber: string;
  private _companyId: Types.ObjectId;
  private _company: Company;
  private _menus: Menu[];
  private _deliveryPersonAvailability: boolean;
  private _reviews: RestaurantReview[];
  private _restaurantAdminId: Types.ObjectId;
  private _restaurantAdmin: User;
  private _status: RestaurantStatus;
  private _openingHours: string;
  private _closingHours: string;
  private _image: string;
  private _logo: string;
  private _audit: Audit;

  constructor(id: Types.ObjectId, props: IRestaurant) {
    super(id);
    this._name = props.name;
    this._description = props.description;
    this._savedAddress = props.savedAddress;
    this._phoneNumber = props.phoneNumber;
    this._companyId = props.companyId;
    this._company = props.company;
    this._menus = props.menus || [];
    this._deliveryPersonAvailability = props.deliveryPersonAvailability;
    this._reviews = props.reviews || [];
    this._restaurantAdminId = props.restaurantAdminId;
    this._restaurantAdmin = props.restaurantAdmin;
    this._status = props.status;
    this._openingHours = props.openingHours;
    this._closingHours = props.closingHours;
    this._image = props.image;
    this._logo = props.logo;
    this._audit = props.audit;
  }

  get name(): string {
    return this._name;
  }

  set name(value: string) {
    this._name = value;
  }

  get description(): string | undefined {
    return this._description;
  }

  set description(value: string | undefined) {
    this._description = value;
  }

  get savedAddress(): { city: string; subCity: string } {
    return this._savedAddress;
  }

  set savedAddress(value: { city: string; subCity: string }) {
    this._savedAddress = value;
  }

  get phoneNumber(): string {
    return this._phoneNumber;
  }

  set phoneNumber(value: string) {
    this._phoneNumber = value;
  }

  get companyId(): Types.ObjectId {
    return this._companyId;
  }

  set companyId(value: Types.ObjectId) {
    this._companyId = value;
  }

  get company(): Company {
    return this._company;
  }

  set company(value: Company) {
    this._company = value;
  }

  get menus(): Menu[] {
    return this._menus;
  }

  set menus(value: Menu[]) {
    this._menus = value;
  }

  get deliveryPersonAvailability(): boolean {
    return this._deliveryPersonAvailability;
  }

  set deliveryPersonAvailability(value: boolean) {
    this._deliveryPersonAvailability = value;
  }

  get reviews(): RestaurantReview[] {
    return this._reviews;
  }

  set reviews(value:RestaurantReview[]) {
    this._reviews = value;
  }

  get restaurantAdminId(): Types.ObjectId {
    return this._restaurantAdminId;
  }

  set restaurantAdminId(value: Types.ObjectId) {
    this._restaurantAdminId = value;
  }

  get restaurantAdmin(): User {
    return this._restaurantAdmin;
  }

  set restaurantAdmin(value: User) {
    this._restaurantAdmin = value;
  }

  get status(): RestaurantStatus {
    return this._status;
  }

  set status(value: RestaurantStatus) {
    this._status = value;
  }

  get openingHours(): string {
    return this._openingHours;
  }

  set openingHours(value: string) {
    this._openingHours = value;
  }

  get closingHours(): string {
    return this._closingHours;
  }

  set closingHours(value: string) {
    this._closingHours = value;
  }

  get image(): string {
    return this._image;
  }

  set image(value: string) {
    this._image = value;
  }

  get logo(): string {
    return this._logo;
  }

  set logo(value: string) {
    this._logo = value;
  }

  get audit(): Audit {
    return this._audit;
  }

  set audit(value: Audit) {
    this._audit = value;
  }

  static create(props: IRestaurant, id?: Types.ObjectId): Result<Restaurant> {
    return Result.ok(new Restaurant(id ?? new Types.ObjectId(), props));
  }
}
