import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';

export class GenerarInformeDto {
  @IsString()
  @IsNotEmpty()
  periodo: string;

  @IsObject()
  @IsOptional()
  datosAdicionales?: Record<string, any>;
}
