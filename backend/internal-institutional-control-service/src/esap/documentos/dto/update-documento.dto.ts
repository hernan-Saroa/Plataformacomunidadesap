import { IsString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { TipoDocumento, EtapaDocumento } from '../entities/documento.entity';

export class UpdateDocumentoDto {
  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsEnum(TipoDocumento)
  tipoDocumento?: TipoDocumento;

  @IsOptional()
  @IsEnum(EtapaDocumento)
  etapa?: EtapaDocumento;

  @IsOptional()
  @IsUUID()
  auditoriaId?: string;

  @IsOptional()
  @IsUUID()
  hallazgoId?: string;

  @IsOptional()
  @IsUUID()
  planMejoramientoId?: string;

  @IsOptional()
  @IsUUID()
  visibleAuditoriaId?: string | null;

  @IsOptional()
  @IsUUID()
  etapaKanbanId?: string | null;

  @IsOptional()
  @IsString()
  etapaNombreKanban?: string | null;
}

