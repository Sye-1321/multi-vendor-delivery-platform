import { forwardRef, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { TYPES } from './../application/constants/types';
import { Audit } from './../domain/audit/audit';
import { Result } from './../domain/result/result';
import { RestaurantReview } from './restaurant-review';
import { throwApplicationError } from './../infrastructure/utilities/exception-instance';
import { RestaurantReviewParser } from './restaurant-review.parser';
import { IUserService } from 'src/user/interfaces/user-service.interface';
import { RestaurantReviewMapper } from './restaurant-review.mapper';
import { IRestaurantReviewService } from './interfaces/restaurant-review-service.interface';
import { IContextService } from 'src/infrastructure/context/context-service.interface';
import { IRestaurantReviewRepository } from 'src/infrastructure/data_access/repositories/interfaces/restaurant-review-repository.interface';
import {
  CreateReviewDTO,
  UpdateReviewDTO,
} from 'src/system-review/dtos/system-review.dto';
import { IRestaurantReviewResponse } from './interfaces/restaurant-review-response.interface';
import { IUserUpdateReview } from 'src/system-review/interfaces/system-review.interface';
import { Context } from 'src/infrastructure/context/context';

@Injectable()
export class RestaurantReviewService implements IRestaurantReviewService {
  constructor(
    @Inject(TYPES.IContextService)
    private readonly contextService: IContextService,
    @Inject(TYPES.IUserService) private readonly userService: IUserService,
    @Inject(TYPES.IRestaurantReviewRepository)
    private readonly restaurantReviewRepository: IRestaurantReviewRepository,
    private readonly restaurantReviewMapper: RestaurantReviewMapper,
  ) {}

  async createReview(
    restaurantId: Types.ObjectId,
    props: CreateReviewDTO,
  ): Promise<Result<IRestaurantReviewResponse>> {
    const context = this.contextService.getContext();
    const user = await this.userService.getContextUser();
    const audit = Audit.createInsertContext(context);
    const restauranReview: RestaurantReview = RestaurantReview.create(
      {
        userId: user.id,
        user: user,
        restaurantId: restaurantId,
        audit: audit,
        ...props,
      },
      new Types.ObjectId(),
    ).getValue();
    const restaurantReviewModel =
      this.restaurantReviewMapper.toPersistence(restauranReview);
    const restauranReviewResult =
      await this.restaurantReviewRepository.createRestaurantReview(
        restaurantReviewModel,
      );
    if (!restauranReviewResult.isSuccess) {
      throwApplicationError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'restaurant review could not be created',
      );
    }
    return Result.ok(
      RestaurantReviewParser.createReviewResponse(
        restauranReviewResult.getValue(),
      ),
    );
  }

  async updateRestaurantReview(
    reviewId: Types.ObjectId,
    props: UpdateReviewDTO,
  ): Promise<Result<IRestaurantReviewResponse>> {
    const context = this.contextService.getContext();
    const user = await this.userService.getContextUser();
    const reviewResult =
      await this.restaurantReviewRepository.getRestaurantReviewById(reviewId);
    if (!reviewResult.isSuccess) {
      throwApplicationError(HttpStatus.NOT_FOUND, 'Review not found');
    }
    const existingReview = reviewResult.getValue();
    if (existingReview.userId.toString() !== user.id.toString()) {
      throwApplicationError(
        HttpStatus.FORBIDDEN,
        'Not authorized to update this review',
      );
    }
    const data = {
      auditModifiedBy: context.email,
      auditModifiedDateTime: new Date().toISOString(),
      ...props,
    };
    this.updateRestaurantReviewData(data, existingReview, context);
    const updateRestaurantReviewResult =
      await this.restaurantReviewRepository.updateRestaurantReviewById(
        existingReview.id,
        data,
      );
    if (!updateRestaurantReviewResult.isSuccess) {
      throwApplicationError(
        HttpStatus.NOT_MODIFIED,
        'restaurant could not be updated',
      );
    }
    const updatedRestaurantReview = updateRestaurantReviewResult.getValue();
    return Result.ok(
      RestaurantReviewParser.createReviewResponse(updatedRestaurantReview),
    );
  }

  private updateRestaurantReviewData(
    data: IUserUpdateReview,
    restaurantReview: RestaurantReview,
    context: Context,
  ) {
    const { reviewText, rating } = data;
    if (reviewText !== undefined) {
      restaurantReview.reviewText = reviewText;
    }
    if (rating !== undefined) {
      restaurantReview.rating = rating;
    }
    Audit.updateContext(context.email, restaurantReview);
  }
}
