import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  UseGuards,
  Query,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { AccessAuthGuard } from '../infrastructure/guards/access-auth.guard';
import { Result } from '../domain/result/result';
import { ISystemReviewService } from './interfaces/system-review-service.interface';
import { TYPES } from 'src/application/constants/types';
import { CreateReviewDTO, UpdateReviewDTO } from './dtos/system-review.dto';
import {
  IPublicSystemReviewResponse,
  ISystemReviewResponse,
} from './interfaces/system-review-response.interface';
import { ParseObjectIdPipe } from 'src/infrastructure/utilities/parse-object-id.pipe';
import { PaginationQueryDTO } from 'src/shared/dtos/pagination-query.dto';

@Controller('system-reviews')
export class SystemReviewController {
  constructor(
    @Inject(TYPES.ISystemReviewService)
    private readonly systemReviewService: ISystemReviewService,
  ) {}
  @UseGuards(AccessAuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createReview(
    @Body() body: CreateReviewDTO,
  ): Promise<Result<ISystemReviewResponse>> {
    return this.systemReviewService.createReview(body);
  }

  @UseGuards(AccessAuthGuard)
  @Patch(':reviewId')
  @HttpCode(HttpStatus.OK)
  async updateReview(
    @Param('reviewId', ParseObjectIdPipe) id: Types.ObjectId,
    @Body() body: UpdateReviewDTO,
  ): Promise<Result<ISystemReviewResponse>> {
    return this.systemReviewService.updateSystemReview(id, body);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async getAllReviews(
    @Query() pagination: PaginationQueryDTO,
  ): Promise<Result<IPublicSystemReviewResponse[]>> {
    return this.systemReviewService.getAllSystemReviews(pagination);
  }

  @UseGuards(AccessAuthGuard)
  @Delete(':reviewId')
  @HttpCode(HttpStatus.OK)
  async deleteReview(
    @Param('reviewId', ParseObjectIdPipe) id: Types.ObjectId,
  ): Promise<Result<void>> {
    return this.systemReviewService.deleteSystemReviewById(id);
  }
}
