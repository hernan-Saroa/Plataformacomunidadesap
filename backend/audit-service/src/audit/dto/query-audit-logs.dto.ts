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
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
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
  @Type(() => Number)
  @IsNumber({}, { message: 'limit debe ser un número' })
  @Min(1, { message: 'limit debe ser al menos 1' })
  @Max(1000, { message: 'limit no puede ser mayor a 1000' })
  limit?: number = 100;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'offset debe ser un número' })
  @Min(0, { message: 'offset no puede ser negativo' })
  offset?: number = 0;
}

