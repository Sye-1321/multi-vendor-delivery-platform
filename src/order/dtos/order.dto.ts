import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus } from '../constants/constants';

const MAX_CART_ITEM_QUANTITY = 100;

export class CreateDeliveryAddressDTO {
  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  subCity: string;
}

export class CreateCartItemDTO {
  @IsMongoId()
  menuItemId: string;

  @IsInt()
  @Min(1)
  @Max(MAX_CART_ITEM_QUANTITY)
  quantity: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  customizations?: string;
}

export class CreateCartDTO {
  @ValidateNested({ each: true })
  @Type(() => CreateCartItemDTO)
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
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
