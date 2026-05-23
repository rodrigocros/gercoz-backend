import { IsString, IsEnum, IsNumber, IsOptional, Min } from 'class-validator';
import { Unit } from '@prisma/client';

export class CreateIngredientDto {
  @IsString() name: string;
  @IsOptional() @IsString() description?: string;
  @IsEnum(Unit) unit: Unit;
  @IsNumber() @Min(0) costPrice: number;
  @IsOptional() @IsString() supplier?: string;
  @IsOptional() @IsNumber() @Min(0) stock?: number;
  @IsOptional() @IsNumber() @Min(0) minStock?: number;
  @IsOptional() isActive?: boolean;
}
