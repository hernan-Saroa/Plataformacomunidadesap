import { IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RechazarConformidadDto {
  @ApiProperty({
    example:
      'La cerradura sigue fallando al girar la llave, quedo duro y no cierra bien. El vidrio quedó con una rayón grande de la instalación.',
    description:
      'Detalle de las inconsistencias encontradas. Obligatorio, mínimo 20 caracteres para evitar mensajes ambiguos. La solicitud regresa a EN_PROGRESO con SLA nuevo de 24h.',
    minLength: 20,
    maxLength: 2000,
  })
  @IsString()
  @MinLength(20, {
    message:
      'Observaciones obligatorias al devolver: mínimo 20 caracteres describiendo el problema.',
  })
  @MaxLength(2000, {
    message: 'Observaciones máximo 2000 caracteres.',
  })
  observacionesConformidad: string;
}
