import { IsString, IsOptional, IsIn, IsInt, Min, Max, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAutosConfigurationDto {
  @ApiProperty({ description: 'Tipo de auto (ej: AUTO_APERTURA, AUTO_NO_PREVISTO)' })
  @IsString()
  tipo: string;

  @ApiProperty({ description: 'Nombre descriptivo del auto' })
  @IsString()
  nombre: string;

  @ApiPropertyOptional({ description: 'Estado del auto (activo/inactivo)', default: 'activo' })
  @IsOptional()
  @IsString()
  @IsIn(['activo', 'inactivo'])
  estado?: string;

  @ApiPropertyOptional({ description: 'Plantilla en formato base64 o link', nullable: true })
  @IsOptional()
  @ValidateIf((o, v) => v !== null && v !== undefined)
  @IsString()
  plantilla?: string;

  @ApiPropertyOptional({
    description: 'Etapa del proceso asociada con este auto. Valores permitidos: RECEPCION, EVALUACION, VALORACION, INDAGACION_PREVIA, INVESTIGACION, JUZGAMIENTO, SEGUNDA_INSTANCIA. NULL significa disponible para todas las etapas.',
    example: 'RECEPCION',
  })
  @IsOptional()
  @ValidateIf((o, v) => v !== null && v !== undefined)
  @IsString()
  stage?: string;

  @ApiPropertyOptional({ description: 'Orden para visualización', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(9999)
  orden?: number;

  // Campos de plantilla
  @ApiPropertyOptional({ description: 'Nombre de la plantilla' })
  @IsOptional()
  @ValidateIf((o, v) => v !== null && v !== undefined)
  @IsString()
  nombre_plantilla?: string;

  @ApiPropertyOptional({ description: 'Descripción de la plantilla' })
  @IsOptional()
  @ValidateIf((o, v) => v !== null && v !== undefined)
  @IsString()
  descripcion_plantilla?: string;

  @ApiPropertyOptional({ description: 'Versión de la plantilla', default: '1.0' })
  @IsOptional()
  @IsString()
  version_plantilla?: string;

  @ApiPropertyOptional({ description: 'Estado de la plantilla (activo/inactivo)', default: 'activo' })
  @IsOptional()
  @IsString()
  @IsIn(['activo', 'inactivo'])
  estado_plantilla?: string;
}

export class UpdateAutosConfigurationDto {
  @ApiPropertyOptional({ description: 'Tipo de auto' })
  @IsOptional()
  @IsString()
  tipo?: string;

  @ApiPropertyOptional({ description: 'Nombre descriptivo del auto' })
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiPropertyOptional({ description: 'Estado del auto (activo/inactivo)' })
  @IsOptional()
  @IsString()
  @IsIn(['activo', 'inactivo'])
  estado?: string;

  @ApiPropertyOptional({ description: 'Plantilla en formato base64 o link', nullable: true })
  @IsOptional()
  @ValidateIf((o, v) => v !== null && v !== undefined)
  @IsString()
  plantilla?: string | null;

  @ApiPropertyOptional({
    description: 'Etapa del proceso asociada con este auto. Valores permitidos: RECEPCION, EVALUACION, VALORACION, INDAGACION_PREVIA, INVESTIGACION, JUZGAMIENTO, SEGUNDA_INSTANCIA. NULL significa disponible para todas las etapas.',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((o, v) => v !== null && v !== undefined)
  @IsString()
  stage?: string | null;

  @ApiPropertyOptional({ description: 'Orden para visualización' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(9999)
  orden?: number;

  // Campos de plantilla
  @ApiPropertyOptional({ description: 'Nombre de la plantilla', nullable: true })
  @IsOptional()
  @ValidateIf((o, v) => v !== null && v !== undefined)
  @IsString()
  nombre_plantilla?: string | null;

  @ApiPropertyOptional({ description: 'Descripción de la plantilla', nullable: true })
  @IsOptional()
  @ValidateIf((o, v) => v !== null && v !== undefined)
  @IsString()
  descripcion_plantilla?: string | null;

  @ApiPropertyOptional({ description: 'Versión de la plantilla' })
  @IsOptional()
  @IsString()
  version_plantilla?: string;

  @ApiPropertyOptional({ description: 'Estado de la plantilla (activo/inactivo)' })
  @IsOptional()
  @IsString()
  @IsIn(['activo', 'inactivo'])
  estado_plantilla?: string;
}

export class AutosConfigurationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  tipo: string;

  @ApiProperty()
  nombre: string;

  @ApiProperty()
  estado: string;

  @ApiPropertyOptional()
  plantilla?: string;

  @ApiPropertyOptional({
    description: 'Etapa del proceso asociada con este auto. NULL significa disponible para todas las etapas.',
  })
  stage: string | null;

  @ApiProperty()
  orden: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  // Campos de plantilla
  @ApiPropertyOptional()
  nombre_plantilla?: string;

  @ApiPropertyOptional()
  descripcion_plantilla?: string;

  @ApiPropertyOptional()
  version_plantilla?: string;

  @ApiPropertyOptional()
  estado_plantilla?: string;
}

export class AutoConfigurationUsageStateDto {
  @ApiProperty()
  status: string;

  @ApiProperty()
  count: number;
}

export class AutoConfigurationUsageProcessDto {
  @ApiProperty()
  processId: string;

  @ApiProperty()
  radicadoProceso: string;

  @ApiProperty()
  estado: string;

  @ApiProperty()
  etapaActual: string;

  @ApiPropertyOptional()
  abogadoAsignadoNombre?: string | null;

  @ApiProperty()
  autosCount: number;

  @ApiPropertyOptional()
  ultimoAutoCreadoAt?: string | null;

  @ApiProperty({
    type: [AutoConfigurationUsageStateDto],
  })
  autoStates: AutoConfigurationUsageStateDto[];
}

export class AutoConfigurationDeletionImpactDto {
  @ApiProperty()
  autoConfigurationId: string;

  @ApiProperty()
  autoTipo: string;

  @ApiProperty()
  autoNombre: string;

  @ApiProperty()
  canDelete: boolean;

  @ApiProperty()
  activeProcessesCount: number;

  @ApiProperty()
  historicalProcessesCount: number;

  @ApiProperty({
    type: [AutoConfigurationUsageProcessDto],
  })
  activeProcesses: AutoConfigurationUsageProcessDto[];
}
