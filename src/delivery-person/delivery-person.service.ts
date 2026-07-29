import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { TYPES } from '../application/constants/types';
import { Audit } from '../domain/audit/audit';
import { Result } from '../domain/result/result';
import { throwApplicationError } from '../infrastructure/utilities/exception-instance';
import { IContextService } from 'src/infrastructure/context/context-service.interface';
import { IDeliveryPersonRepository } from 'src/infrastructure/data_access/repositories/interfaces/deliveryperson-repository.interface';
import { IRestaurantService } from 'src/restaurant/interfaces/restaurant-service.interface';
import { DeliveryPersonMapper } from './delivery-person.mapper';
import { DeliveryPersonParser } from './delivery-person.parser';
import { DeliveryPerson } from './delivery-person';
import {
  CreateDeliveryPersonDTO,
  CreateDeliveryPersonWithProfileImageDTO,
  UpdateDeliveryPersonDTO,
} from './dtos/delivery-person.dto';
import { IDeliveryPersonService } from './interfaces/delivery-person-service.interface';
import { IDeliveryPersonResponse } from './interfaces/deliveryperson-response.interface';
import { AvailabilityStatus } from './constants/constants';
import { DeliveryPersonFactory } from './factories/delivery-person.factory';
import { SaveFileLocally } from 'src/application/saveFileLocally';

@Injectable()
export class DeliveryPersonService implements IDeliveryPersonService {
  constructor(
    @Inject(TYPES.IContextService)
    private readonly contextService: IContextService,
    @Inject(TYPES.IDeliveryPersonRepository)
    private readonly deliveryPersonRepository: IDeliveryPersonRepository,
    @Inject(TYPES.IRestaurantService)
    private readonly restaurantService: IRestaurantService,
    private readonly deliveryPersonMapper: DeliveryPersonMapper,
  ) {}

  async createSystemWideDeliveryPerson(
    props: CreateDeliveryPersonDTO,
    profileImageFile: Express.Multer.File,
  ): Promise<Result<IDeliveryPersonResponse>> {
    return this.createDeliveryPerson(props, profileImageFile);
  }

  async createRestaurantDeliveryPerson(
    props: CreateDeliveryPersonDTO,
    profileImageFile: Express.Multer.File,
  ): Promise<Result<IDeliveryPersonResponse>> {
    const restaurantId = await this.getRestaurantIdForCurrentAdmin();
    return this.createDeliveryPerson(props, profileImageFile, restaurantId);
  }

  async getSystemWideDeliveryPersons(): Promise<
    Result<IDeliveryPersonResponse[]>
  > {
    return this.getDeliveryPersonsByFilter({ deliveryType: 'SYSTEM' });
  }

  async getRestaurantDeliveryPersons(): Promise<
    Result<IDeliveryPersonResponse[]>
  > {
    const restaurantId = await this.getRestaurantIdForCurrentAdmin();
    return this.getDeliveryPersonsByFilter({ restaurantId });
  }

  async getSystemWideDeliveryPersonById(
    id: Types.ObjectId,
  ): Promise<Result<IDeliveryPersonResponse>> {
    const { deliveryPerson } = await this.validateSystemWideDeliveryPerson(id);
    return Result.ok(
      DeliveryPersonParser.createDeliveryPersonResponse(deliveryPerson),
    );
  }

  async getRestaurantDeliveryPersonById(
    id: Types.ObjectId,
  ): Promise<Result<IDeliveryPersonResponse>> {
    const { deliveryPerson } = await this.validateRestaurantDeliveryPerson(id);
    return Result.ok(
      DeliveryPersonParser.createDeliveryPersonResponse(deliveryPerson),
    );
  }

  async updateSystemWideDeliveryPerson(
    id: Types.ObjectId,
    props: UpdateDeliveryPersonDTO,
    profileImageFile?: Express.Multer.File,
  ): Promise<Result<IDeliveryPersonResponse>> {
    return this.updateDeliveryPerson(
      id,
      props,
      this.validateSystemWideDeliveryPerson.bind(this),
      profileImageFile,
    );
  }

  async updateRestaurantDeliveryPerson(
    id: Types.ObjectId,
    props: UpdateDeliveryPersonDTO,
    profileImageFile?: Express.Multer.File,
  ): Promise<Result<IDeliveryPersonResponse>> {
    return this.updateDeliveryPerson(
      id,
      props,
      this.validateRestaurantDeliveryPerson.bind(this),
      profileImageFile,
    );
  }

  private async getRestaurantIdForCurrentAdmin(): Promise<Types.ObjectId> {
    const restaurant = await this.restaurantService.getRestaurantByRAdmin();
    if (!restaurant.deliveryPersonAvailability) {
      throwApplicationError(
        HttpStatus.BAD_REQUEST,
        'The restaurant does not have delivery person availability',
      );
    }
    return restaurant.id;
  }

  private async createDeliveryPerson(
    props: CreateDeliveryPersonDTO,
    profileImageFile: Express.Multer.File,
    restaurantId?: Types.ObjectId,
  ): Promise<Result<IDeliveryPersonResponse>> {
    const existingPerson =
      await this.deliveryPersonRepository.findByPhoneNumber(props.phoneNumber);
    if (existingPerson.isSuccess) {
      throwApplicationError(
        HttpStatus.CONFLICT,
        'A delivery person with this phone number already exists.',
      );
    }
    const context = this.contextService.getContext();
    const audit = Audit.createInsertContext(context);
    const profileImage = await SaveFileLocally(
      profileImageFile,
      'delivery-person-profiles',
    );
    const newProps: CreateDeliveryPersonWithProfileImageDTO = {
      ...props,
      profileImage,
    };
    const deliveryPerson = DeliveryPersonFactory.createDeliveryPerson(
      newProps,
      audit,
      restaurantId,
    );
    const model = this.deliveryPersonMapper.toPersistence(deliveryPerson);
    const result =
      await this.deliveryPersonRepository.createDeliveryPerson(model);
    if (!result.isSuccess) {
      throwApplicationError(
        HttpStatus.BAD_REQUEST,
        'Delivery person could not be created. Try again later.',
      );
    }
    const response = await this.deliveryPersonRepository.getDeliveryPersonById(
      result.getValue().id,
    );
    return Result.ok(
      DeliveryPersonParser.createDeliveryPersonResponse(response.getValue()),
    );
  }

  private async getDeliveryPersonsByFilter(
    filter: Record<string, any>,
  ): Promise<Result<IDeliveryPersonResponse[]>> {
    const result =
      await this.deliveryPersonRepository.getDeliveryPersons(filter);
    if (!result.isSuccess) {
      throwApplicationError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Failed to fetch delivery persons',
      );
    }
    return Result.ok(
      DeliveryPersonParser.createDeliveryPersonsResponse(result.getValue()),
      'Delivery persons retrieved successfully',
    );
  }

  private async validateSystemWideDeliveryPerson(
    id: Types.ObjectId,
  ): Promise<{ deliveryPerson: DeliveryPerson }> {
    const result =
      await this.deliveryPersonRepository.getDeliveryPersonById(id);
    if (!result.isSuccess) {
      throwApplicationError(
        HttpStatus.BAD_REQUEST,
        'DeliveryPerson does not exist',
      );
    }
    const deliveryPerson = result.getValue();
    if (deliveryPerson.restaurantId !== null) {
      throwApplicationError(HttpStatus.FORBIDDEN, 'Unauthorized access');
    }
    return { deliveryPerson };
  }

  private async validateRestaurantDeliveryPerson(
    id: Types.ObjectId,
  ): Promise<{ restaurantId: Types.ObjectId; deliveryPerson: DeliveryPerson }> {
    const restaurantId = await this.getRestaurantIdForCurrentAdmin();
    const result =
      await this.deliveryPersonRepository.getDeliveryPersonById(id);
    if (!result.isSuccess) {
      throwApplicationError(
        HttpStatus.BAD_REQUEST,
        'DeliveryPerson does not exist',
      );
    }
    const deliveryPerson = result.getValue();
    if (
      !deliveryPerson.restaurantId ||
      !deliveryPerson.restaurantId.equals(restaurantId)
    ) {
      throwApplicationError(
        HttpStatus.UNAUTHORIZED,
        'Unauthorized access to this delivery person',
      );
    }
    return { restaurantId, deliveryPerson };
  }

  private async updateDeliveryPerson(
    id: Types.ObjectId,
    props: UpdateDeliveryPersonDTO,
    validateMethod: (
      id: Types.ObjectId,
    ) => Promise<{ deliveryPerson: DeliveryPerson }>,
    profileImageFile?: Express.Multer.File,
  ): Promise<Result<IDeliveryPersonResponse>> {
    try {
      const context = this.contextService.getContext();
      const { deliveryPerson } = await validateMethod(id);

      if (props?.phoneNumber) {
        const existing = await this.deliveryPersonRepository.findByPhoneNumber(
          props.phoneNumber,
        );
        if (
          existing.isSuccess &&
          existing.getValue().id.toString() !== id.toString()
        ) {
          throwApplicationError(
            HttpStatus.CONFLICT,
            'A delivery person with this phone number already exists.',
          );
        }
      }

      const data = {
        auditModifiedBy: context.email,
        auditModifiedDateTime: new Date().toISOString(),
        ...props,
      };

      if (profileImageFile) {
        const profileImage = await SaveFileLocally(
          profileImageFile,
          'delivery-person-profiles',
        );
        data['profileImage'] = profileImage;
      }

      this.updateDeliveryPersonData(data, deliveryPerson, context);
      const updatedModel =
        this.deliveryPersonMapper.toPersistence(deliveryPerson);
      const updateResult =
        await this.deliveryPersonRepository.updateDeliveryPersonById(
          id,
          updatedModel,
        );
      if (!updateResult.isSuccess) {
        return Result.fail(
          'Failed to update delivery person',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      const updated =
        await this.deliveryPersonRepository.getDeliveryPersonById(id);
      return Result.ok(
        DeliveryPersonParser.createDeliveryPersonResponse(updated.getValue()),
        'Delivery person updated successfully',
      );
    } catch {
      return Result.fail(
        'Delivery person update failed',
        HttpStatus.EXPECTATION_FAILED,
      );
    }
  }

  public async getDeliveryPersonById(
    id: Types.ObjectId,
  ): Promise<DeliveryPerson> {
    const result =
      await this.deliveryPersonRepository.getDeliveryPersonById(id);
    if (!result.isSuccess) {
      throwApplicationError(
        HttpStatus.BAD_REQUEST,
        `DeliveryPerson with ID ${id} does not exist`,
      );
    }
    return result.getValue();
  }

  private updateDeliveryPersonData(
    data: any,
    deliveryPerson: DeliveryPerson,
    context: any,
  ): void {
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && key in deliveryPerson) {
        (deliveryPerson as any)[key] = value;
      }
    });
    Audit.updateContext(context.email, deliveryPerson);
  }

  private changeDeliveryPersonStatus(
    deliveryPerson: DeliveryPerson,
    context: any,
  ): void {
    deliveryPerson.availabilityStatus =
      deliveryPerson.availabilityStatus === AvailabilityStatus.WORKING
        ? AvailabilityStatus.AVAILABLE
        : AvailabilityStatus.WORKING;
    Audit.updateContext(context.email, deliveryPerson);
  }

  async pickFromRestaurant(
    deliveryPersonId: Types.ObjectId,
    restaurantId: Types.ObjectId,
  ) {
    const result =
      await this.deliveryPersonRepository.getDeliveryPersonByIdAndRestaurantId(
        deliveryPersonId,
        restaurantId,
      );
    if (!result.isSuccess) {
      throwApplicationError(
        HttpStatus.BAD_REQUEST,
        'no restaurant delivery person with that Id',
      );
    }
    return (
      result.getValue().availabilityStatus === AvailabilityStatus.AVAILABLE
    );
  }

  async pickFromSystem(deliveryPersonId: Types.ObjectId) {
    const result =
      await this.deliveryPersonRepository.getDeliveryPersonById(
        deliveryPersonId,
      );
    if (!result.isSuccess) {
      throwApplicationError(
        HttpStatus.BAD_REQUEST,
        'no system delivery person with that Id',
      );
    }
    return (
      result.getValue().availabilityStatus === AvailabilityStatus.AVAILABLE
    );
  }

  async markAsAssigned(deliveryPersonId: Types.ObjectId) {
    const result =
      await this.deliveryPersonRepository.getDeliveryPersonById(
        deliveryPersonId,
      );
    if (!result.isSuccess) {
      throwApplicationError(
        HttpStatus.BAD_REQUEST,
        'no delivery person with that Id',
      );
    }
    const context = this.contextService.getContext();
    const data = {
      auditModifiedBy: context.email,
      auditModifiedDateTime: new Date().toISOString(),
      availabilityStatus: AvailabilityStatus.WORKING,
    };
    this.changeDeliveryPersonStatus(result.getValue(), context);
    const update = await this.deliveryPersonRepository.updateDeliveryPersonById(
      deliveryPersonId,
      data,
    );
    if (!update.isSuccess) {
      throwApplicationError(
        HttpStatus.BAD_REQUEST,
        'delivery person could not be updated',
      );
    }
    return await this.deliveryPersonRepository.getDeliveryPersonById(
      deliveryPersonId,
    );
  }

  async markAsAvailable(deliveryPersonId: Types.ObjectId) {
    const result =
      await this.deliveryPersonRepository.getDeliveryPersonById(
        deliveryPersonId,
      );
    if (!result.isSuccess) {
      throwApplicationError(
        HttpStatus.BAD_REQUEST,
        'no delivery person with that Id',
      );
    }
    const context = this.contextService.getContext();
    const data = {
      auditModifiedBy: context.email,
      auditModifiedDateTime: new Date().toISOString(),
      availabilityStatus: AvailabilityStatus.AVAILABLE,
    };
    this.changeDeliveryPersonStatus(result.getValue(), context);
    const update = await this.deliveryPersonRepository.updateDeliveryPersonById(
      deliveryPersonId,
      data,
    );
    if (!update.isSuccess) {
      throwApplicationError(
        HttpStatus.BAD_REQUEST,
        'delivery person could not be updated',
      );
    }
    return await this.deliveryPersonRepository.getDeliveryPersonById(
      deliveryPersonId,
    );
  }
}
