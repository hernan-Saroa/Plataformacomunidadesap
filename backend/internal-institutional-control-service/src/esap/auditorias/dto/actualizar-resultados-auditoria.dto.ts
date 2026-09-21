import { IsArray, IsOptional, IsString, MaxLength } from 'class-validator';

/** Resultados de la auditoría registrados en la etapa de Ejecución (EFDS-1636). */
export class ActualizarResultadosAuditoriaDto {
  @IsArray()
  @IsString({ each: true })
  @MaxLength(2000, { each: true })
  @IsOptional()
  fortalezas?: string[];

  @IsArray()
  @IsString({ each: true })
  @MaxLength(2000, { each: true })
  @IsOptional()
  recomendacionesGenerales?: string[];

  @IsString()
  @MaxLength(10000)
  @IsOptional()
  conclusiones?: string;
}
