// system-review.service.ts
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { TYPES } from '../application/constants/types';
import { Audit } from '../domain/audit/audit';
import { Result } from '../domain/result/result';
import { Context } from '../infrastructure/context/context';
import { SystemReview } from './system-review';
import { throwApplicationError } from '../infrastructure/utilities/exception-instance';
import { SystemReviewParser } from './system-review.parser';
import { IUserService } from 'src/user/interfaces/user-service.interface';
import { IContextService } from 'src/infrastructure/context/context-service.interface';
import { ISystemReviewRepository } from 'src/infrastructure/data_access/repositories/interfaces/system-review-repository.interface';
import { ISystemReviewResponse } from './interfaces/system-review-response.interface';
import { CreateReviewDTO, UpdateReviewDTO } from './dtos/system-review.dto';
import { IUserUpdateReview } from './interfaces/system-review.interface';
import { SystemReviewMapper } from './system-review.mapper';
import { UserMapper } from 'src/user/user.mapper';

@Injectable()
export class SystemReviewService {
  constructor(
    @Inject(TYPES.IContextService)
    private readonly contextService: IContextService,
    @Inject(TYPES.IUserService)
    private readonly userService: IUserService,
    @Inject(TYPES.ISystemReviewRepository)
    private readonly systemReviewRepository: ISystemReviewRepository,
    private readonly systemReviewMapper: SystemReviewMapper,
    private readonly userMapper: UserMapper,
  ) {}

  async createReview(
    props: CreateReviewDTO,
  ): Promise<Result<ISystemReviewResponse>> {
    const context = this.contextService.getContext();
    const user = await this.userService.getContextUser();
    const existingReviewResult = await this.systemReviewRepository.getSystemReviewByUserId(user.id);
    if (existingReviewResult.isSuccess && existingReviewResult.getValue()) {
      throwApplicationError(HttpStatus.CONFLICT, 'Review already exists');
    }
    const systemReview = SystemReview.create(
      {
        userId: user.id,
        user: user,
        ...props,
        audit: Audit.createInsertContext(context),
      },
      new Types.ObjectId(),
    ).getValue();
    console.log(systemReview, "System Review")
    const systemReviewDataModel = this.systemReviewMapper.toPersistence(systemReview);
    const systemReviewResult = await this.systemReviewRepository.createSystemReview(systemReviewDataModel);
    if (!systemReviewResult.isSuccess) {
      throwApplicationError(
        HttpStatus.BAD_REQUEST,
        'System review could not be created',
      );
    }

    return Result.ok(
      SystemReviewParser.createSystemReviewResponse(
        systemReviewResult.getValue(),
      ),
    );
  }

  async updateSystemReview(
    reviewId: Types.ObjectId,
    props: UpdateReviewDTO,
  ): Promise<Result<ISystemReviewResponse>> {
    const context = this.contextService.getContext();
    const user = await this.userService.getContextUser();
    const systemReviewResult = await this.systemReviewRepository.getSystemReviewById(reviewId);
    if (!systemReviewResult.isSuccess) {
      throwApplicationError(HttpStatus.NOT_FOUND, 'Review not found');
    }

    if (systemReviewResult.getValue().userId.toString() !== user.id.toString()
    ) {
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

    this.updateSystemReviewData(data, systemReviewResult.getValue(), context);
    const updateSystemReviewResult = await this.systemReviewRepository.updateSystemReviewById(reviewId, data);

    if (!updateSystemReviewResult.isSuccess) {
      throwApplicationError(
        HttpStatus.NOT_MODIFIED,
        'System review could not be updated',
      );
    }

    return Result.ok(
      SystemReviewParser.createSystemReviewResponse(
        updateSystemReviewResult.getValue(),
      ),
    );
  }

  async getAllSystemReviews(): Promise<Result<ISystemReviewResponse[]>> {
    const systemReviewsResult =
      await this.systemReviewRepository.getAllSystemReviews();

    if (!systemReviewsResult.isSuccess) {
      throwApplicationError(HttpStatus.NOT_FOUND, 'No reviews found');
    }

    const systemReviews = systemReviewsResult.getValue();
    let response: ISystemReviewResponse[] = [];

    if (systemReviews && systemReviews.length) {
      response = SystemReviewParser.createSystemReviewsResponse(systemReviews);
    }

    return Result.ok(response);
  }

  async getSystemReviewById(
    reviewId: Types.ObjectId,
  ): Promise<Result<ISystemReviewResponse>> {
    const systemReviewResult =
      await this.systemReviewRepository.getSystemReviewById(reviewId);

    if (!systemReviewResult.isSuccess) {
      throwApplicationError(HttpStatus.NOT_FOUND, 'System review not found');
    }

    return Result.ok(
      SystemReviewParser.createSystemReviewResponse(
        systemReviewResult.getValue(),
      ),
    );
  }

  async deleteSystemReviewById(
    reviewId: Types.ObjectId,
  ): Promise<Result<void>> {
    const user = await this.userService.getContextUser();
    const systemReviewResult =
      await this.systemReviewRepository.getSystemReviewById(reviewId);

    if (!systemReviewResult.isSuccess) {
      throwApplicationError(HttpStatus.NOT_FOUND, 'System review not found');
    }

    if (
      systemReviewResult.getValue().userId.toString() !== user.id.toString()
    ) {
      throwApplicationError(
        HttpStatus.FORBIDDEN,
        'Not authorized to delete this review',
      );
    }

    const deleted = await this.systemReviewRepository.deleteSystemReview(reviewId);

    if (!deleted.isSuccess) {
      throwApplicationError(
        HttpStatus.BAD_REQUEST,
        'Failed to delete system review',
      );
    }

    return Result.ok(undefined, 'System review deleted successfully');
  }

  private updateSystemReviewData(
    data: IUserUpdateReview,
    systemReview: SystemReview,
    context: Context,
  ) {
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && key in systemReview) {
        (systemReview as any)[key] = value;
      }
    });

    Audit.updateContext(context.email, systemReview);
  }
}
