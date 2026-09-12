import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

/**
 * DTO para las operaciones de la Etapa 6 — Autorización Corporativa (RF-AUT-001).
 *
 * - Aprobación (`/requests/:id/authorize`): `observaciones` es opcional (nota de visto bueno).
 * - Devolución (`/requests/:id/return-authorization`): `observaciones` es obligatoria
 *   (hallazgos o reparos con al menos 3 caracteres).
 */
export class AutorizacionObservacionesDto {
  @ApiPropertyOptional({
    description:
      'Observaciones del visto bueno corporativo o hallazgos obligatorios en caso de devolución.',
    example: 'Aprobado el gasto e itinerario conforme a la disponibilidad presupuestal.',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  observaciones?: string;
}
