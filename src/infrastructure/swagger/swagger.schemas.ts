import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from 'src/application/constants/constants';
import { OrderStatus, PaymentStatus } from 'src/order/constants/constants';

export class AddressSchema {
  @ApiProperty()
  city: string;

  @ApiProperty()
  subCity: string;
}

export class AuditSchema {
  @ApiProperty()
  auditCreatedBy: string;

  @ApiProperty({ format: 'date-time' })
  auditCreatedDateTime: string;

  @ApiPropertyOptional()
  auditModifiedBy?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  auditModifiedDateTime?: string;

  @ApiPropertyOptional()
  auditDeletedBy?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  auditDeletedDateTime?: string;
}

export class PublicUserSchema {
  @ApiProperty({ pattern: '^[0-9a-fA-F]{24}$' })
  id: string;

  @ApiProperty()
  name: string;
}

export class UserSchema extends AuditSchema {
  @ApiProperty({ pattern: '^[0-9a-fA-F]{24}$' })
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ format: 'email' })
  email: string;

  @ApiProperty()
  phoneNumber: string;

  @ApiProperty({ enum: Role })
  role: Role;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional({ type: () => AddressSchema })
  savedAddress?: AddressSchema;
}

export class TokenPairSchema {
  @ApiProperty({ description: 'JWT access token' })
  accessToken: string;

  @ApiProperty({ description: 'JWT refresh token' })
  refreshToken: string;
}

export class SignedInUserSchema extends UserSchema {
  @ApiProperty({ type: () => TokenPairSchema })
  tokens: TokenPairSchema;

  @ApiProperty({ description: 'Access-token lifetime in milliseconds' })
  tokenExpiresIn: number;
}

export class NotificationSchema {
  @ApiProperty({ pattern: '^[0-9a-fA-F]{24}$' }) id: string;
  @ApiProperty({ pattern: '^[0-9a-fA-F]{24}$' }) orderId: string;
  @ApiProperty() title: string;
  @ApiProperty() message: string;
  @ApiProperty({ format: 'date-time', nullable: true }) readAt: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt: string;
}

export class NotificationReadSchema {
  @ApiProperty({ example: true }) read: true;
}

export class DeliveryPersonSchema extends AuditSchema {
  @ApiProperty({ pattern: '^[0-9a-fA-F]{24}$' }) id: string;
  @ApiProperty() profileImage: string;
  @ApiProperty() name: string;
  @ApiProperty() phoneNumber: string;
  @ApiProperty() availabilityStatus: string;
  @ApiProperty() status: string;
  @ApiProperty() delivery_type: string;
  @ApiPropertyOptional({ pattern: '^[0-9a-fA-F]{24}$' }) restaurantId?: string;
  @ApiProperty({ type: () => AddressSchema }) savedAddress: AddressSchema;
}

export class OrderLineItemSchema {
  @ApiProperty({ pattern: '^[0-9a-fA-F]{24}$' }) id: string;
  @ApiProperty({ pattern: '^[0-9a-fA-F]{24}$' }) menuItemId: string;
  @ApiProperty() quantity: number;
  @ApiProperty() subTotal: number;
  @ApiPropertyOptional() customizations?: string;
}

export class OrderCartSchema {
  @ApiProperty({ pattern: '^[0-9a-fA-F]{24}$' }) id: string;
  @ApiProperty() totalPrice: number;
  @ApiProperty({ type: () => [OrderLineItemSchema] })
  cartItems: OrderLineItemSchema[];
}

export class OrderTimelineSchema {
  @ApiProperty({ enum: OrderStatus, nullable: true }) from: OrderStatus | null;
  @ApiProperty({ enum: OrderStatus }) to: OrderStatus;
  @ApiProperty({ enum: Role }) actorRole: Role;
  @ApiProperty({ format: 'date-time' }) occurredAt: string;
  @ApiPropertyOptional() reason?: string;
}

export class OrderSchema extends AuditSchema {
  @ApiProperty({ pattern: '^[0-9a-fA-F]{24}$' }) id: string;
  @ApiProperty({ pattern: '^[0-9a-fA-F]{24}$' }) userId: string;
  @ApiProperty({ pattern: '^[0-9a-fA-F]{24}$' }) restaurantId: string;
  @ApiProperty({ type: () => OrderCartSchema }) cart: OrderCartSchema;
  @ApiProperty({ type: () => AddressSchema }) deliveryAddress: AddressSchema;
  @ApiProperty({ enum: OrderStatus }) status: OrderStatus;
  @ApiProperty({ pattern: '^[0-9a-fA-F]{24}$', nullable: true })
  deliveryPersonId: string | null;
  @ApiProperty({ type: () => DeliveryPersonSchema, nullable: true })
  deliveryPerson: DeliveryPersonSchema | null;
  @ApiProperty({ enum: PaymentStatus }) paymentStatus: PaymentStatus;
  @ApiProperty() totalPrice: number;
  @ApiProperty({ type: () => [OrderTimelineSchema] })
  timeline: OrderTimelineSchema[];
}

export class ExceptionResponseSchema {
  @ApiProperty({ example: false }) isSuccess: boolean;
  @ApiProperty({ example: 400 }) statusCode: number;
  @ApiProperty() message: string;
  @ApiProperty() path: string;
  @ApiProperty({ format: 'date-time' }) timeStamp: string;
  @ApiProperty() method: string;
}

export class HealthResponseSchema {
  @ApiProperty({ example: 'ok' }) status: 'ok';
  @ApiProperty({ example: 'multi-vendor-delivery-platform' }) service: string;
  @ApiPropertyOptional({ example: 'connected' }) database?: 'connected';
}
