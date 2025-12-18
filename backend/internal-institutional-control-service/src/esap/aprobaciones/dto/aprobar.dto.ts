import { IsOptional, IsString } from 'class-validator';

export class AprobarDto {
  @IsOptional()
  @IsString()
  observaciones?: string;
}

