import { IsString, IsNotEmpty, IsOptional, IsNumber, IsUUID, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMantenimientoDto {
  @ApiProperty({ example: 'id-sede-uuid', description: 'Sede a la que pertenece la solicitud' })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  idSede: string;

  @ApiPropertyOptional({ example: 'id-espacio-uuid', description: 'Espacio fisico asociado (catálogo de espacios)' })
  @IsString()
  @IsOptional()
  @IsUUID()
  idEspacio?: string;

  @ApiProperty({ example: 'Dirección Académica', description: 'Nombre del area solicitante' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(150)
  nombreAreaSolicitante: string;

  @ApiPropertyOptional({ example: 'uuid-area', description: 'Identificador opcional de la dependencia en auth.dependencias' })
  @IsString()
  @IsOptional()
  @IsUUID()
  idAreaSolicitante?: string;

  @ApiProperty({ example: '2', description: 'Piso o nivel de la ubicación' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  piso: string;

  @ApiProperty({ example: 'Aula 204 u Oficina 301', description: 'Salon, oficina o ubicación específica' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  salon: string;

  @ApiPropertyOptional({ example: 'Frente al ascensor, edificio principal', description: 'Detalle adicional de ubicación' })
  @IsString()
  @IsOptional()
  ubicacionDetalle?: string;

  @ApiProperty({ example: 'CORRECTIVO', description: 'Tipo de mantenimiento (hasta EFDS-1732 se usa este campo)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  tipoMantenimiento: string;

  @ApiProperty({ example: 'Falla en el sistema de aire acondicionado del Aula 204', description: 'Descripción de la solicitud' })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  descripcion: string;

  @ApiPropertyOptional({ example: 'http://storage/evidencia1.jpg', description: 'Evidencia inicial opcional (URL externa legacy)' })
  @IsString()
  @IsOptional()
  evidenciaInicialUrl?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['<uuid-evidencia1>', '<uuid-evidencia2>'],
    description: 'IDs de evidencias subidas previamente por el endpoint /mantenimiento/evidencias/upload y pendientes de ligar a la solicitud',
  })
  @IsOptional()
  @IsString({ each: true })
  @IsUUID(undefined, { each: true })
  uploadedEvidenciaIds?: string[];

  @ApiPropertyOptional({ example: 'MEDIA', description: 'Prioridad: BAJA, MEDIA, ALTA, URGENTE' })
  @IsString()
  @IsOptional()
  prioridad?: string;
}

export class UpdateMantenimientoEstadoDto {
  @ApiProperty({ example: 'EN_ANALISIS', description: 'Nuevo estado de la solicitud' })
  @IsString()
  @IsNotEmpty()
  estado: string;

  @ApiPropertyOptional({ example: 'Ing. Carlos Pérez' })
  @IsString()
  @IsOptional()
  responsableAsignado?: string;

  @ApiPropertyOptional({ example: 'Se completó el cambio de gas y filtro' })
  @IsString()
  @IsOptional()
  observaciones?: string;

  @ApiPropertyOptional({ example: '2026-09-18' })
  @IsString()
  @IsOptional()
  fechaEjecucion?: string;
}
