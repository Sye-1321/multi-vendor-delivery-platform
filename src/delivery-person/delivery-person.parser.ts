import { AuditParser } from 'src/audit/audit.parser';
import { DeliveryPerson } from './delivery-person';
import { IDeliveryPersonResponse } from './interfaces/deliveryperson-response.interface';

export class DeliveryPersonParser {
  static createDeliveryPersonResponse(deliveryPerson: DeliveryPerson): IDeliveryPersonResponse {
    const deliveryPersonResponse: IDeliveryPersonResponse = {
      id: deliveryPerson.id,
      profileImage: deliveryPerson.profileImage,
      name: deliveryPerson.name,
      phoneNumber: deliveryPerson.phoneNumber,
      availabilityStatus: deliveryPerson.availabilityStatus,
      status: deliveryPerson.status,
      delivery_type: deliveryPerson.deliveryType,
      restaurantId: deliveryPerson.restaurantId,
      savedAddress: deliveryPerson.savedAddress,
      ...AuditParser.createAuditResponse(deliveryPerson.audit),
    };
    return deliveryPersonResponse;
  }

  static createDeliveryPersonsResponse(deliveryPersons: DeliveryPerson[]): IDeliveryPersonResponse[] {
    return deliveryPersons.map((deliveryPerson) =>
      DeliveryPersonParser.createDeliveryPersonResponse(deliveryPerson),
    );
  }
}
