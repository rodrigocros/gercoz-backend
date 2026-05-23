import { IsEnum, IsInt, IsOptional, IsString, IsArray, ValidateNested, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { OrderType } from '@prisma/client';

export class CreateOrderItemDto {
  @IsString() productId: string;
  @IsInt() @Min(1) quantity: number;
  @IsOptional() @IsString() notes?: string;
}

export class CreateOrderDto {
  @IsEnum(OrderType) type: OrderType;
  @IsOptional() @IsInt() tableNumber?: number;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsNumber() @Min(0) discount?: number;
  @IsArray() @ValidateNested({ each: true }) @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}
