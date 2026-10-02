import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsBoolean } from 'class-validator';

export enum TipoFirmaAprobacion {
  JEFE_DEPENDENCIA = 'JEFE_DEPENDENCIA',
  GERENTE_PROYECTO = 'GERENTE_PROYECTO',
  ENLACE_ELABORO = 'ENLACE_ELABORO',
  ANALISTA = 'ANALISTA',
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

  @ApiPropertyOptional({
    description: 'Código OTP de 6 dígitos verificado para la firma',
    example: '654321',
  })
  @IsOptional()
  @IsString()
  otp?: string;

  @ApiPropertyOptional({
    description: 'Identificador de la verificación OTP generada previamente',
    example: 'viat:sol-123:JEFE_DEPENDENCIA:usr-456',
  })
  @IsOptional()
  @IsString()
  verificationId?: string;

  @ApiPropertyOptional({
    description: 'Identificador único del certificado digital ESAP emitido',
    example: 'ESAP-CERT-VIAT-AB12-CD34',
  })
  @IsOptional()
  @IsString()
  certificadoId?: string;

  @ApiPropertyOptional({
    description: 'Hash SHA-256 criptográfico del documento / solicitud',
  })
  @IsOptional()
  @IsString()
  hashSha256?: string;
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

export class SolicitarOtpFirmaDto {
  @ApiPropertyOptional({
    description: 'Tipo de firma para la cual se solicita el OTP (JEFE_DEPENDENCIA, GERENTE_PROYECTO, ENLACE_ELABORO)',
  })
  @IsOptional()
  @IsString()
  tipoFirma?: string;

  @ApiPropertyOptional({
    description: 'Etiqueta o nombre descriptivo de la etapa de firma',
    example: 'Aprobación de la Solicitud de Comisión (Formato 023)',
  })
  @IsOptional()
  @IsString()
  etapaLabel?: string;
}

export class VerificarOtpFirmaDto {
  @ApiPropertyOptional({
    description: 'Identificador de la sesión de verificación OTP',
    example: 'viat:sol-123:JEFE_DEPENDENCIA:usr-456',
  })
  @IsOptional()
  @IsString()
  verificationId?: string;

  @ApiPropertyOptional({
    description: 'Código numérico OTP de 6 dígitos ingresado por el usuario',
    example: '123456',
  })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({
    description: 'Código numérico OTP ingresado por el usuario (alias de code)',
    example: '123456',
  })
  @IsOptional()
  @IsString()
  otp?: string;

  @ApiPropertyOptional({
    description: 'Rol o etapa de la firma digital (ej. ENLACE_ELABORO, JEFE_DEPENDENCIA)',
    example: 'ENLACE_ELABORO',
  })
  @IsOptional()
  @IsString()
  tipoFirma?: string;

  @ApiPropertyOptional({
    description: 'Indica si se debe consumir el código OTP de inmediato',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  consume?: boolean;
}

export class SolicitarFirmasDto {
  @ApiPropertyOptional({
    description: 'Código OTP del enlace de dependencia al radicar/enviar a firmas',
    example: '654321',
  })
  @IsOptional()
  @IsString()
  otp?: string;

  @ApiPropertyOptional({
    description: 'Identificador de la verificación OTP del enlace',
  })
  @IsOptional()
  @IsString()
  verificationId?: string;

  @ApiPropertyOptional({
    description: 'Identificador del certificado digital de elaboración',
  })
  @IsOptional()
  @IsString()
  certificadoId?: string;

  @ApiPropertyOptional({
    description: 'Hash SHA-256 criptográfico de la elaboración',
  })
  @IsOptional()
  @IsString()
  hashSha256?: string;

  @ApiPropertyOptional({
    description: 'Nombre del enlace firmante',
  })
  @IsOptional()
  @IsString()
  nombreFirmante?: string;

  @ApiPropertyOptional({
    description: 'Cargo del enlace firmante',
  })
  @IsOptional()
  @IsString()
  cargoFirmante?: string;
}

