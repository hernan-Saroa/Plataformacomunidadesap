import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class RechazarInformeDto {
  @IsNotEmpty()
  @IsString()
  motivoRechazo: string;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
