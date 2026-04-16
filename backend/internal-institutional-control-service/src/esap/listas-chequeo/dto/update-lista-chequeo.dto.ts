import { IsString, IsOptional, IsBoolean, IsArray, ValidateNested, IsUUID, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateItemListaChequeoDto } from './create-lista-chequeo.dto';

export class UpdateListaChequeoDto {
  @IsOptional()
  @IsString()
  codigo?: string;

  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsString()
  categoria?: string;

  @IsOptional()
  @IsIn(['cumplimiento', 'proceso', 'sistema', 'procedimiento', 'planeacion', 'ejecucion', 'comunicacion'])
  tipo?: string;

  // ═══════════════════════════════════════════════════════════════════════════
  // CAMPOS OPCIONALES DE BD EXISTENTE
  // ═══════════════════════════════════════════════════════════════════════════

  @IsOptional()
  @IsString()
  version?: string;

  @IsOptional()
  @IsIn(['activa', 'inactiva', 'obsoleta'])
  estado?: string;

  @IsOptional()
  @IsArray()
  aplicablePara?: string[];

  @IsOptional()
  @IsUUID()
  tipoAuditoriaId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateItemListaChequeoDto)
  items?: CreateItemListaChequeoDto[];

  @IsOptional()
  @IsBoolean()
  activa?: boolean;

  // ═══════════════════════════════════════════════════════════════════════════
  // VINCULACIÓN CON AUDITORÍA
  // ═══════════════════════════════════════════════════════════════════════════

  @IsOptional()
  @IsUUID()
  auditoriaId?: string;

  @IsOptional()
  @IsString()
  nombreAuditoria?: string;

  @IsOptional()
  @IsString()
  auditorResponsable?: string;

  // ═══════════════════════════════════════════════════════════════════════════
  // FASES QUE IMPACTA LA LISTA
  // ═══════════════════════════════════════════════════════════════════════════

  @IsOptional()
  @IsBoolean()
  fasePlaneacion?: boolean;

  @IsOptional()
  @IsBoolean()
  faseEjecucion?: boolean;

  @IsOptional()
  @IsBoolean()
  faseComunicacion?: boolean;

  @IsOptional()
  @IsBoolean()
  faseSeguimiento?: boolean;

  // ═══════════════════════════════════════════════════════════════════════════
  // VINCULACIÓN CON ETAPA KANBAN DINÁMICA
  // ═══════════════════════════════════════════════════════════════════════════

  /** ID de la etapa en la tabla etapa_kanban (estable aunque cambie el nombre) */
  @IsOptional()
  @IsUUID()
  etapaKanbanId?: string;

  /** Nombre de la etapa al momento de guardar (snapshot para display aunque cambie la config) */
  @IsOptional()
  @IsString()
  etapaNombreKanban?: string;
}
