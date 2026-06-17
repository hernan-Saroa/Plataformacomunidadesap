import {
  IsOptional,
  IsString,
  IsNumber,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class QueryAuditLogsDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  method?: string;

  @IsOptional()
  @IsString()
  module?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'userId debe ser un número' })
  userId?: number;

  @IsOptional()
  @IsString()
  ipAddress?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'statusCode debe ser un número' })
  statusCode?: number;

  @IsOptional()
  @IsString()
  entityName?: string; // Filtrar por nombre de entidad modificada

  @IsOptional()
  @IsString()
  entityId?: string; // Filtrar por ID del registro modificado

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'limit debe ser un número' })
  @Min(1, { message: 'limit debe ser al menos 1' })
  @Max(1000, { message: 'limit no puede ser mayor a 1000' })
  limit?: number = 10;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'offset debe ser un número' })
  @Min(0, { message: 'offset no puede ser negativo' })
  offset?: number = 0;
}

