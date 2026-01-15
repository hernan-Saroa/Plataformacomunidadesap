import { IsString, IsOptional, IsInt, IsBoolean, Min, Max } from 'class-validator';

export class UpdateTipoAuditoriaDto {
  @IsString()
  @IsOptional()
  codigo?: string;

  @IsString()
  @IsOptional()
  nombre?: string;

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
