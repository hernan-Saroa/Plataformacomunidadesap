import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, Length, MinLength } from 'class-validator';

/**
 * DTO para la cancelación de una comisión de servicios con trazabilidad (RF-AUT-003, Etapa 6).
 *
 * Criterios de aceptación (Gherkin):
 * - Dada una comisión en curso, cuando la dependencia solicita cancelarla,
 *   el sistema permite registrar la cancelación con motivo y responsable.
 * - Motivo es obligatorio.
 * - Señala la necesidad de reintegro/liberación si hay recursos comprometidos (Etapa 8).
 */
export class CancelarComisionDto {
  @ApiProperty({
    description: 'Motivo obligatorio y motivado de la cancelación de la comisión (mínimo 5 caracteres).',
    example: 'Cancelación solicitada por la Dirección Territorial debido a postergación del evento académico.',
    minLength: 5,
    maxLength: 2000,
  })
  @IsNotEmpty({ message: 'El motivo de cancelación es obligatorio.' })
  @IsString({ message: 'El motivo de cancelación debe ser una cadena de texto.' })
  @MinLength(5, { message: 'El motivo de cancelación debe tener al menos 5 caracteres.' })
  @Length(5, 2000, { message: 'El motivo de cancelación debe tener entre 5 y 2000 caracteres.' })
  motivoCancelacion: string;

  @ApiPropertyOptional({
    description: 'Nombre, cargo o dependencia solicitante/responsable de la orden de cancelación.',
    example: 'Subdirección Académica - Dr. Carlos Ruiz',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @Length(0, 255)
  responsableCancelacion?: string;

  @ApiPropertyOptional({
    description:
      'Indica explícitamente si existen recursos comprometidos que requieran reintegro o liberación presupuestal (Etapa 8). Si no se envía, el sistema lo infiere automáticamente según el avance presupuestal/SIIF.',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  recursosComprometidos?: boolean;
}
