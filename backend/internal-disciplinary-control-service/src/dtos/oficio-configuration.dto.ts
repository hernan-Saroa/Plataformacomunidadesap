import { IsString, IsOptional, IsIn, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOficioConfigurationDto {
  @ApiProperty({ description: 'Tipo de oficio (ej: OFICIO_SOLICITUD_INFORMACION, OFICIO_CITACION)' })
  @IsString()
  tipo: string;

  @ApiProperty({ description: 'Nombre descriptivo del oficio' })
  @IsString()
  nombre: string;

  @ApiPropertyOptional({ description: 'Código único del oficio (ej: OFIC-001)' })
  @IsOptional()
  @IsString()
  codigo?: string;

  @ApiPropertyOptional({ description: 'Descripción del oficio' })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiPropertyOptional({ description: 'Estado del oficio (activo/inactivo)', default: 'activo' })
  @IsOptional()
  @IsString()
  @IsIn(['activo', 'inactivo'])
  estado?: string;

  @ApiPropertyOptional({ description: 'Plantilla en formato base64 o link', nullable: true })
  @IsOptional()
  @IsString()
  plantilla?: string;

  @ApiPropertyOptional({
    description: 'Etapa del proceso asociada con este oficio. Valores permitidos: RECEPCION, EVALUACION, VALORACION, INDAGACION_PREVIA, INVESTIGACION, JUZGAMIENTO, SEGUNDA_INSTANCIA. NULL significa disponible para todas las etapas.',
    example: 'RECEPCION',
  })
  @IsOptional()
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
  @IsString()
  nombre_plantilla?: string;

  @ApiPropertyOptional({ description: 'Descripción de la plantilla' })
  @IsOptional()
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

export class UpdateOficioConfigurationDto {
  @ApiPropertyOptional({ description: 'Tipo de oficio' })
  @IsOptional()
  @IsString()
  tipo?: string;

  @ApiPropertyOptional({ description: 'Nombre descriptivo del oficio' })
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiPropertyOptional({ description: 'Código único del oficio' })
  @IsOptional()
  @IsString()
  codigo?: string;

  @ApiPropertyOptional({ description: 'Descripción del oficio' })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiPropertyOptional({ description: 'Estado del oficio (activo/inactivo)' })
  @IsOptional()
  @IsString()
  @IsIn(['activo', 'inactivo'])
  estado?: string;

  @ApiPropertyOptional({ description: 'Plantilla en formato base64 o link' })
  @IsOptional()
  @IsString()
  plantilla?: string;

  @ApiPropertyOptional({
    description: 'Etapa del proceso asociada con este oficio. Valores permitidos: RECEPCION, EVALUACION, VALORACION, INDAGACION_PREVIA, INVESTIGACION, JUZGAMIENTO, SEGUNDA_INSTANCIA.',
  })
  @IsOptional()
  @IsString()
  stage?: string;

  @ApiPropertyOptional({ description: 'Orden para visualización' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(9999)
  orden?: number;

  // Campos de plantilla
  @ApiPropertyOptional({ description: 'Nombre de la plantilla' })
  @IsOptional()
  @IsString()
  nombre_plantilla?: string;

  @ApiPropertyOptional({ description: 'Descripción de la plantilla' })
  @IsOptional()
  @IsString()
  descripcion_plantilla?: string;

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

export class OficioConfigurationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  tipo: string;

  @ApiProperty()
  nombre: string;

  @ApiPropertyOptional()
  codigo?: string;

  @ApiPropertyOptional()
  descripcion?: string;

  @ApiProperty()
  estado: string;

  @ApiPropertyOptional()
  plantilla?: string;

  @ApiPropertyOptional({
    description: 'Etapa del proceso asociada con este oficio. NULL significa disponible para todas las etapas.',
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
