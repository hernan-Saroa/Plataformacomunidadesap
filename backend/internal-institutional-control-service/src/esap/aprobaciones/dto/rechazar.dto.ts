import { IsString, IsNotEmpty } from 'class-validator';

export class RechazarDto {
  @IsString()
  @IsNotEmpty()
  motivo_rechazo: string;
}

