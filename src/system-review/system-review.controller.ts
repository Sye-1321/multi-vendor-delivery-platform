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
} from '@nestjs/common';
import { Types } from 'mongoose';
import { AccessAuthGuard } from '../infrastructure/guards/access-auth.guard';
import { Result } from '../domain/result/result';
import { ISystemReviewService } from './interfaces/system-review-service.interface';
import { TYPES } from 'src/application/constants/types';
import { CreateReviewDTO, UpdateReviewDTO } from './dtos/system-review.dto';
import { ISystemReviewResponse } from './interfaces/system-review-response.interface';

@Controller('reviews')
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
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async updateReview(
    @Param('id') id: Types.ObjectId,
    @Body() body: UpdateReviewDTO,
  ): Promise<Result<ISystemReviewResponse>> {
    console.log(body, 'body');
    return this.systemReviewService.updateSystemReview(id, body);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async getAllReviews(): Promise<Result<ISystemReviewResponse[]>> {
    return this.systemReviewService.getAllSystemReviews();
  }

  @UseGuards(AccessAuthGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteReview(@Param('id') id: Types.ObjectId): Promise<Result<void>> {
    return this.systemReviewService.deleteSystemReviewById(id);
  }
}
