import { DeliveryPerson } from '../delivery-person';
import { throwApplicationError } from 'src/infrastructure/utilities/exception-instance';
import { HttpStatus } from '@nestjs/common';
import { Types } from 'mongoose';
import { CreateDeliveryPersonWithProfileImageDTO } from '../dtos/delivery-person.dto';
import { Audit } from 'src/domain/audit/audit';
import {
  DeliveryPersonOwnership,
  AvailabilityStatus,
  DeliveryPersonStatus,
} from '../constants/constants';

export class DeliveryPersonFactory {
  static createDeliveryPerson(
    props: CreateDeliveryPersonWithProfileImageDTO,
    audit: Audit,
    restaurantId?: Types.ObjectId,
  ): DeliveryPerson {
    const baseData = {
      profileImage: props.profileImage,
      name: props.name,
      phoneNumber: props.phoneNumber,
      deliveryType: restaurantId
        ? DeliveryPersonOwnership.RESTAURANT
        : DeliveryPersonOwnership.SYSTEM,
      savedAddress: props.savedAddress,
      audit,
      availabilityStatus: AvailabilityStatus.AVAILABLE,
      status: DeliveryPersonStatus.ACTIVE,
    };

    const strategyMap: Record<DeliveryPersonOwnership, () => DeliveryPerson> = {
      [DeliveryPersonOwnership.RESTAURANT]: () =>
        DeliveryPerson.create({
          ...baseData,
          restaurantId: restaurantId!,
        }).getValue(),

      [DeliveryPersonOwnership.SYSTEM]: () =>
        DeliveryPerson.create(baseData).getValue(),
    };

    const ownershipType = restaurantId
      ? DeliveryPersonOwnership.RESTAURANT
      : DeliveryPersonOwnership.SYSTEM;

    const strategy = strategyMap[ownershipType];

    if (!strategy) {
      throwApplicationError(
        HttpStatus.BAD_REQUEST,
        'Invalid delivery person creation strategy.',
      );
    }

    return strategy();
  }
}
