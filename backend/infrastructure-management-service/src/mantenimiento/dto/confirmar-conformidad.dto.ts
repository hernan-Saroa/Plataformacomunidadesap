import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ConfirmarConformidadDto {
  @ApiPropertyOptional({
    example: 'Gracias, todo quedó perfecto. Pintura y cerradura OK.',
    description:
      'Comentario adicional del área solicitante al confirmar conformidad. Opcional.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, {
    message: 'Comentarios no deben exceder 500 caracteres',
  })
  observacionesConformidad?: string;

  // ===== EFDS-1738 RF-INF-009 Calificación del Servicio Recibido (1-5) =====
  // OQ-1 default: OPCIONAL (confirmar conformidad sin rating queda NULL).
  // Si en el futuro OQ-1 se define OBLIGATORIA: cambiar @IsOptional por
  // @IsNotEmpty({ message: 'Calificación del servicio (1-5) es obligatoria para confirmar conformidad EFDS-1738' })
  // y usar @ApiProperty en lugar de @ApiPropertyOptional.
  @ApiPropertyOptional({
    example: 4,
    description:
      'Valoración del servicio recibido en escala entera 1 muy mala a 5 muy buena. Se registra solo al CONFIRMAR conformidad. OQ-1 default OPCIONAL; si falta se guarda NULL y no se contabiliza en consolidados promedio.',
    minimum: 1,
    maximum: 5,
  })
  @IsOptional()
  @IsInt({ message: 'Calificación servicio debe ser número entero (1..5).' })
  @Min(1, { message: 'Calificación servicio mínima permitida: 1.' })
  @Max(5, { message: 'Calificación servicio máxima permitida: 5.' })
  calificacionServicio?: 1 | 2 | 3 | 4 | 5;
}
