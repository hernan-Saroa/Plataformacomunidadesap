import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsNumber,
  IsDateString,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TipoAlerta, EstadoAlerta } from '../entities/alerta-enviada.entity';

export class ListarAlertasDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsUUID()
  terminoId?: string;

  @IsOptional()
  @IsEnum(TipoAlerta)
  tipo?: TipoAlerta;

  @IsOptional()
  @IsEnum(EstadoAlerta)
  estado?: EstadoAlerta;

  @IsOptional()
  @IsDateString()
  fechaDesde?: string;

  @IsOptional()
  @IsDateString()
  fechaHasta?: string;
}

