import { IsOptional, IsString } from 'class-validator';

export class AprobarInformeDto {
  @IsOptional()
  @IsString()
  observaciones?: string;
}
