import { IsString, IsNotEmpty, IsOptional, IsInt, IsBoolean, IsHexColor, Min, Max } from 'class-validator';

export class CreateTipoAuditoriaDto {
  @IsString()
  @IsNotEmpty()
  codigo: string;

  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsString()
  @IsOptional()
  alcance?: string;

  @IsInt()
  @Min(1)
  @Max(365)
  @IsOptional()
  duracionPromedio?: number;

  @IsInt()
  @Min(1)
  @Max(20)
  @IsOptional()
  equipoPromedio?: number;

  @IsString()
  @IsOptional()
  color?: string;

  @IsBoolean()
  @IsOptional()
  activa?: boolean;
}
