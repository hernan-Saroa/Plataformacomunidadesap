import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMantenimientoDto {
  @ApiProperty({ example: 'id-sede-uuid' })
  @IsString()
  @IsNotEmpty()
  idSede: string;

  @ApiPropertyOptional({ example: 'id-espacio-uuid' })
  @IsString()
  @IsOptional()
  idEspacio?: string;

  @ApiProperty({ example: 'CORRECTIVO' })
  @IsString()
  @IsNotEmpty()
  tipoMantenimiento: string; // PREVENTIVO, CORRECTIVO, LOCATIVO, TECNOLOGICO

  @ApiProperty({ example: 'ALTA' })
  @IsString()
  @IsNotEmpty()
  prioridad: string; // BAJA, MEDIA, ALTA, URGENTE

  @ApiProperty({ example: 'Falla en el sistema de aire acondicionado del Aula 204' })
  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @ApiProperty({ example: 'docente.pedro@esap.edu.co' })
  @IsString()
  @IsNotEmpty()
  solicitanteEmail: string;

  @ApiProperty({ example: 'Pedro Gómez' })
  @IsString()
  @IsNotEmpty()
  solicitanteNombre: string;

  @ApiPropertyOptional({ example: '2026-09-15' })
  @IsString()
  @IsOptional()
  fechaProgramada?: string;

  @ApiPropertyOptional({ example: 450000 })
  @IsNumber()
  @IsOptional()
  costoEstimado?: number;
}

export class UpdateMantenimientoEstadoDto {
  @ApiProperty({ example: 'EN_PROCESO' })
  @IsString()
  @IsNotEmpty()
  estado: string; // PENDIENTE, EN_PROCESO, COMPLETADO, RECHAZADO

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
