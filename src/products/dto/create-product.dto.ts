import { IsString, IsNumber, IsOptional, IsEnum, IsArray, ValidateNested, Min, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { Unit } from '@prisma/client';

export class RecipeItemDto {
  @IsString() ingredientId: string;
  @IsNumber() @Min(0) quantity: number;
  @IsEnum(Unit) unit: Unit;
}

export class CreateProductDto {
  @IsString() name: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() categoryId?: string;
  @IsNumber() @Min(0) salePrice: number;
  @IsOptional() @IsNumber() preparationTime?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsArray() @ValidateNested({ each: true }) @Type(() => RecipeItemDto)
  recipeItems: RecipeItemDto[];
}
