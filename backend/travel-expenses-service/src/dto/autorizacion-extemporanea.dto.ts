import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, Length, MinLength } from 'class-validator';

/**
 * DTO para la autorización excepcional de comisiones extemporáneas por Dirección Nacional (RF-AUT-002, Etapa 6).
 */
export class AutorizacionExtemporaneaDto {
  @ApiPropertyOptional({
    description: 'Justificación o motivación de la autorización excepcional otorgada por Dirección Nacional.',
    example: 'Se autoriza la comisión extemporánea por estricta necesidad del servicio para atender audiencia territorial.',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  justificacion?: string;

  @ApiPropertyOptional({
    description: 'Indica si la autorización es emitida por el delegado formal de la Dirección Nacional.',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  esDelegado?: boolean;

  @ApiPropertyOptional({
    description: 'Código OTP de 6 dígitos para validación de la firma digital de Dirección Nacional.',
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
    description: 'Hash criptográfico SHA-256 de la firma de Dirección Nacional.',
  })
  @IsOptional()
  @IsString()
  hashSha256?: string;

  @ApiPropertyOptional({
    description: 'Estampa gráfica o estampa de la firma digital.',
  })
  @IsOptional()
  @IsString()
  firmaImagen?: string;
}

/**
 * DTO para el rechazo de comisiones extemporáneas por Dirección Nacional (RF-AUT-002, Etapa 6).
 * La justificación es obligatoria para garantizar trazabilidad.
 */
export class RechazoExtemporaneaDto {
  @ApiProperty({
    description: 'Justificación obligatoria y motivada del rechazo de la comisión extemporánea (mínimo 5 caracteres).',
    example: 'No se justifica la extemporaneidad ni se aporta justificación de fuerza mayor para radicación tardía.',
    minLength: 5,
    maxLength: 2000,
  })
  @IsNotEmpty({ message: 'La justificación del rechazo es obligatoria.' })
  @IsString()
  @MinLength(5, { message: 'La justificación del rechazo debe tener al menos 5 caracteres.' })
  @Length(5, 2000)
  justificacion: string;

  @ApiPropertyOptional({
    description: 'Indica si el rechazo es emitido por el delegado formal de la Dirección Nacional.',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  esDelegado?: boolean;
}
