import { IsString, IsEmail, MinLength } from 'class-validator';

export class RegisterRestaurantDto {
  @IsString() @MinLength(2) restaurantName: string;
  @IsString() @MinLength(2) slug: string;
  @IsString() @MinLength(2) name: string;
  @IsEmail() email: string;
  @IsString() @MinLength(6) password: string;
}
