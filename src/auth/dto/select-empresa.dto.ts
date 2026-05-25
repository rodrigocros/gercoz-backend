import { IsString, IsNotEmpty } from 'class-validator';

export class SelectEmpresaDto {
  @IsString()
  @IsNotEmpty()
  restaurantId: string;
}
