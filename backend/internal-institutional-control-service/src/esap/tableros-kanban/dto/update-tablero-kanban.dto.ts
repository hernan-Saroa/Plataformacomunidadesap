import { IsString, IsOptional, IsBoolean, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TipoTablero } from '../entities/tablero-kanban.entity';
import { CreateEtapaKanbanDto } from './create-etapa-kanban.dto';

export class UpdateTableroKanbanDto {
  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsEnum(TipoTablero)
  tipo?: TipoTablero;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateEtapaKanbanDto)
  etapas?: CreateEtapaKanbanDto[];
}

