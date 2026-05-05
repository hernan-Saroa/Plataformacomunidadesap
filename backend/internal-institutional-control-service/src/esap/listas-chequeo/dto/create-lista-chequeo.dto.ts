import { IsString, IsOptional, IsBoolean, IsArray, ValidateNested, IsUUID, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateItemListaChequeoDto {
  @IsString()
  texto: string;

  @IsOptional()
  @IsString()
  categoria?: string;

  @IsOptional()
  @IsBoolean()
  obligatorio?: boolean;

  @IsOptional()
  orden?: number;

  @IsOptional()
  @IsString()
  documentoBibliotecaId?: string;

  @IsOptional()
  @IsString()
  documentoNombre?: string;
}

export class CreateListaChequeoDto {
  @IsString()
  codigo: string;

  @IsString()
  nombre: string;

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
  // CAMPOS OBLIGATORIOS EN BD EXISTENTE
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
  @IsString()
  createdBy?: string;

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
