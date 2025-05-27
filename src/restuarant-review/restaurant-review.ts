import { Types } from 'mongoose';
import { Entity } from 'src/domain/entity/entity';
import { IRestuarantReview } from './interfaces/restuarant-review.interface';
import { User } from 'src/user/user';
import { Audit } from 'src/domain/audit/audit';
import { Result } from 'src/domain/result/result';
import { HttpStatus } from '@nestjs/common';

export class RestaurantReview extends Entity<IRestuarantReview> {
  private _userId: Types.ObjectId;
  private _user: User;
  private _restaurantId: Types.ObjectId;
  private _rating: number;
  private _reviewText: string;
  private _audit: Audit;

  constructor(id: Types.ObjectId, props: IRestuarantReview) {
    super(id);
    this._userId = props.userId;
    this._user = props.user;
    this._restaurantId = props.restaurantId;
    this._rating = props.rating;
    this._reviewText = props.reviewText;
    this._audit = props.audit;
  }

  get userId(): Types.ObjectId {
    return this._userId;
  }

  set userId(userId: Types.ObjectId) {
    this._userId = userId;
  }

  get user(): User {
    return this._user;
  }

  set user(user: User) {
    this._user = user;
  }

  get restaurantId(): Types.ObjectId {
    return this._restaurantId;
  }

  set restaurantId(restaurantId: Types.ObjectId) {
    this._restaurantId = restaurantId;
  }

  get rating(): number {
    return this._rating;
  }

  set rating(rating: number) {
    this._rating = rating;
  }

  get reviewText(): string {
    return this._reviewText;
  }

  set reviewText(reviewText: string) {
    this._reviewText = reviewText;
  }

  get audit(): Audit {
    return this._audit;
  }

  set audit(audit: Audit) {
    this._audit = audit;
  }

  static create(props: IRestuarantReview, id?: Types.ObjectId): Result<RestaurantReview> {
    if (!props.user || !props.user.id) {
      return Result.fail<RestaurantReview>('User or User ID is missing', HttpStatus.EXPECTATION_FAILED,);
    }

    return Result.ok(new RestaurantReview(id ?? new Types.ObjectId(), props));
  }
}
