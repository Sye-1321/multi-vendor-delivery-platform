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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const MAX_CART_ITEM_QUANTITY = 100;

export class CreateDeliveryAddressDTO {
  @ApiProperty({ example: 'Nairobi' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ example: 'Westlands' })
  @IsString()
  @IsNotEmpty()
  subCity: string;
}

export class CreateCartItemDTO {
  @ApiProperty({
    description: 'Menu item MongoDB ObjectId',
    pattern: '^[0-9a-fA-F]{24}$',
  })
  @IsMongoId()
  menuItemId: string;

  @ApiProperty({ minimum: 1, maximum: MAX_CART_ITEM_QUANTITY })
  @IsInt()
  @Min(1)
  @Max(MAX_CART_ITEM_QUANTITY)
  quantity: number;

  @ApiPropertyOptional({ maxLength: 500, example: 'No onions' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  customizations?: string;
}

export class CreateCartDTO {
  @ApiProperty({ type: () => [CreateCartItemDTO], minItems: 1, maxItems: 50 })
  @ValidateNested({ each: true })
  @Type(() => CreateCartItemDTO)
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  cartItems: CreateCartItemDTO[];
}

export class CreateOrderDTO {
  @ApiProperty({ type: () => CreateCartDTO })
  @ValidateNested()
  @Type(() => CreateCartDTO)
  @IsNotEmpty()
  cart: CreateCartDTO;

  @ApiProperty({ type: () => CreateDeliveryAddressDTO })
  @ValidateNested()
  @Type(() => CreateDeliveryAddressDTO)
  @IsNotEmpty()
  deliveryAddress: CreateDeliveryAddressDTO;
}

export class UpdateOrderStatusDTO {
  @ApiProperty({ enum: OrderStatus })
  @IsEnum(OrderStatus)
  status: OrderStatus;
}
