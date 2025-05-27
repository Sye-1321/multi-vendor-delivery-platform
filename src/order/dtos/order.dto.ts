import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus } from '../constants/constants';

export class CreateDeliveryAddressDTO {
  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  subCity: string;
}

export class CreateCartItemDTO {
  @IsString()
  @IsNotEmpty()
  cartItemId: string;

  @IsNumber()
  @IsNotEmpty()
  quantity: number;

  @IsNumber()
  @IsNotEmpty()
  subTotal: number;

  @IsOptional()
  @IsString()
  customizations?: string;
}

export class CreateCartDTO {
  @IsNumber()
  @IsNotEmpty()
  totalPrice: number;

  @ValidateNested({ each: true })
  @Type(() => CreateCartItemDTO)
  @IsArray()
  cartItems: CreateCartItemDTO[];
}

export class CreateOrderDTO {
  @ValidateNested()
  @Type(() => CreateCartDTO)
  @IsNotEmpty()
  cart: CreateCartDTO;

  @ValidateNested()
  @Type(() => CreateDeliveryAddressDTO)
  @IsNotEmpty()
  deliveryAddress: CreateDeliveryAddressDTO;
}

export class UpdateOrderStatusDTO {
  @IsEnum(OrderStatus)
  status: OrderStatus;
}
