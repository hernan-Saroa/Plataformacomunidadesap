import { IsOptional, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class FilterDocenteDto {
  @ApiPropertyOptional({ description: 'Búsqueda por nombre, apellido, documento o correo' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  estadoRund?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  escalafonDocente?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoriaMinciencias?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sedePrincipalId?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10;
}
