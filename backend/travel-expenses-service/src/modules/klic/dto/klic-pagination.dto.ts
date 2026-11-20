import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { KlicContratoDto } from './klic-contrato.dto';

export class KlicPaginationQueryDto {
  @ApiPropertyOptional({ description: 'Página actual (por defecto 1)', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ description: 'Límite de registros por página (por defecto 10, máximo 100)', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10;

  @ApiPropertyOptional({ description: 'Término de búsqueda opcional (cédula, número de contrato o nombre)' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filtro específico por número de identificación' })
  @IsOptional()
  @IsString()
  numeroIdentificacion?: string;
}

export class PaginatedKlicContratosResponseDto {
  data: KlicContratoDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

