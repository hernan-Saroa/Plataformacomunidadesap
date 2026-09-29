import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsBoolean } from 'class-validator';

export enum TipoFirmaAprobacion {
  JEFE_DEPENDENCIA = 'JEFE_DEPENDENCIA',
  GERENTE_PROYECTO = 'GERENTE_PROYECTO',
}

export class FirmarSolicitudDto {
  @ApiProperty({
    description: 'Tipo de firma de aprobación requerida previo a la radicación',
    enum: TipoFirmaAprobacion,
    example: TipoFirmaAprobacion.JEFE_DEPENDENCIA,
  })
  @IsEnum(TipoFirmaAprobacion)
  @IsNotEmpty()
  tipoFirma: TipoFirmaAprobacion;

  @ApiProperty({
    description: 'Nombre completo del firmante',
    example: 'Dr. Carlos Mendoza',
  })
  @IsString()
  @IsNotEmpty()
  nombreFirmante: string;

  @ApiProperty({
    description: 'Cargo oficial del firmante',
    example: 'Director Nacional',
  })
  @IsString()
  @IsNotEmpty()
  cargoFirmante: string;

  @ApiPropertyOptional({
    description: 'Imagen o trazo de la firma en base64 (data:image/png;base64,...)',
  })
  @IsOptional()
  @IsString()
  firmaImagen?: string;

  @ApiPropertyOptional({
    description: 'Indica si firma por ausencia o desplazamiento del titular',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  esAusencia?: boolean;

  @ApiPropertyOptional({
    description: 'Motivo de la ausencia o desplazamiento si aplica',
    example: 'Desplazamiento del Director Territorial a comisión institucional',
  })
  @IsOptional()
  @IsString()
  motivoAusencia?: string;

  @ApiPropertyOptional({
    description: 'Comentarios u observaciones de la aprobación',
    example: 'Aprobado y autorizado para desplazamiento',
  })
  @IsOptional()
  @IsString()
  comentarios?: string;
}

export class DevolverFirmaDto {
  @ApiProperty({
    description: 'Motivo por el cual se devuelve la solicitud en revisión de firmas',
    example: 'Se debe corregir el itinerario de vuelos para coincidir con la agenda',
  })
  @IsString()
  @IsNotEmpty()
  motivo: string;
}
