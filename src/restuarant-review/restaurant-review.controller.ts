import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { AccessAuthGuard } from '../infrastructure/guards/access-auth.guard';
import { Result } from '../domain/result/result';
import { CreateReviewDTO, UpdateReviewDTO } from 'src/system-review/dtos/system-review.dto';
import { IRestaurantReviewResponse } from './interfaces/restaurant-review-response.interface';
import { TYPES } from 'src/application/constants/types';
import { IRestaurantReviewService } from './interfaces/restaurant-review-service.interface';

@UseGuards(AccessAuthGuard)
@Controller('restaurant-reviews')
export class RestaurantReviewController {
  constructor( 
    @Inject(TYPES.IRestaurantReviewService) private readonly restaurantReviewService: IRestaurantReviewService,
  ) {}

  @Post(':restaurantId')
  @HttpCode(HttpStatus.CREATED)
  async createReview(
    @Param('restaurantId') restaurantId: Types.ObjectId,
    @Body() body: CreateReviewDTO,
  ): Promise<Result<IRestaurantReviewResponse>> {
    return this.restaurantReviewService.createReview(
      restaurantId,
      body,
    );
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async updateReview(
    @Param('id') id: string,
    @Body() body: UpdateReviewDTO,
  ): Promise<Result<IRestaurantReviewResponse>> {
    return this.restaurantReviewService.updateRestaurantReview(
      new Types.ObjectId(id),
      body,
    );
  }
}
