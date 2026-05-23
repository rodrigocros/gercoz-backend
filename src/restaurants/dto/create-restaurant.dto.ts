import { IsString, MinLength, IsEmail } from 'class-validator';

export class CreateRestaurantDto {
  @IsString() @MinLength(2) restaurantName: string;
  @IsString() @MinLength(2) slug: string;
  @IsString() @MinLength(2) adminName: string;
  @IsEmail() adminEmail: string;
  @IsString() @MinLength(6) adminPassword: string;
}
