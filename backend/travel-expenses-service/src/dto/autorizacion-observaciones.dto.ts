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

  @ApiPropertyOptional({
    description: 'Código OTP de 6 dígitos para validación de la firma digital de Subdirección.',
    example: '123456',
  })
  @IsOptional()
  @IsString()
  otp?: string;

  @ApiPropertyOptional({
    description: 'Identificador de verificación emitido en solicitarOtpFirma.',
  })
  @IsOptional()
  @IsString()
  verificationId?: string;

  @ApiPropertyOptional({
    description: 'Identificador del certificado digital generado para la firma.',
  })
  @IsOptional()
  @IsString()
  certificadoId?: string;

  @ApiPropertyOptional({
    description: 'Hash criptográfico SHA-256 de la firma digital de Subdirección.',
  })
  @IsOptional()
  @IsString()
  hashSha256?: string;

  @ApiPropertyOptional({
    description: 'Estampa gráfica o sello de la firma digital de Subdirección.',
  })
  @IsOptional()
  @IsString()
  firmaImagen?: string;
}
