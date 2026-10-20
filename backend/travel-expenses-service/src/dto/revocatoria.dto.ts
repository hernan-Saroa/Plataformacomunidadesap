import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Length,
  MinLength,
} from 'class-validator';

/**
 * DTO para el registro de la revocatoria en SIIF Nación por parte del Ordenador del Gasto.
 * Surge cuando una comisión previamente AUTORIZADA es cancelada por el jefe de dependencia.
 * Requiere el registro formal en SIIF Nación y la carga obligatoria del reporte en PDF.
 */
export class RegistrarRevocatoriaSiifDto {
  @ApiProperty({
    description: 'Número de acto administrativo, resolución o consecutivo de revocatoria registrado en SIIF Nación.',
    example: 'ACTO-REV-2026-089',
    minLength: 2,
    maxLength: 100,
  })
  @IsNotEmpty({ message: 'El número de acto o consecutivo de revocatoria en SIIF es obligatorio.' })
  @IsString({ message: 'El número de acto debe ser una cadena de texto.' })
  @Length(2, 100, { message: 'El número de acto debe tener entre 2 y 100 caracteres.' })
  numeroActoRevocatoria: string;

  @ApiProperty({
    description: 'Fecha en que se registró la revocatoria en SIIF Nación (formato YYYY-MM-DD o ISO).',
    example: '2026-10-19',
  })
  @IsNotEmpty({ message: 'La fecha del acto de revocatoria en SIIF Nación es obligatoria.' })
  @IsString({ message: 'La fecha debe ser una cadena válida.' })
  fechaActoRevocatoria: string;

  @ApiProperty({
    description: 'Justificación detallada de la revocatoria por parte de la Ordenación del Gasto.',
    example: 'Se revoca comisión autorizada según solicitud justificada del Jefe de Dependencia y registro en SIIF.',
    minLength: 5,
    maxLength: 2000,
  })
  @IsNotEmpty({ message: 'La justificación de la revocatoria es obligatoria.' })
  @IsString({ message: 'La justificación debe ser una cadena de texto.' })
  @MinLength(5, { message: 'La justificación debe tener al menos 5 caracteres.' })
  @Length(5, 2000, { message: 'La justificación debe tener entre 5 y 2000 caracteres.' })
  justificacion: string;

  @ApiProperty({
    description: 'Reporte oficial de la revocatoria registrada en SIIF Nación en formato PDF (Base64 o data URL).',
    example: 'data:application/pdf;base64,JVBERi0xLjQK...',
  })
  @IsNotEmpty({ message: 'El archivo PDF del reporte de revocatoria registrado en SIIF Nación es obligatorio.' })
  @IsString({ message: 'El reporte de revocatoria debe ser una cadena en formato base64 o URL.' })
  reporteRevocatoriaPdfBase64: string;

  @ApiPropertyOptional({
    description: 'Nombre original del archivo PDF del reporte de SIIF.',
    example: 'Reporte_Revocatoria_SIIF_COM-2026-001.pdf',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @Length(0, 255)
  nombreArchivoPdf?: string;
}

/**
 * DTO para la aplicación de reducción presupuestal de RP en SIIF Nación por parte del Grupo de Presupuesto.
 * Aplica cuando la comisión revocada ya contaba con Registro Presupuestal (RP) expedido.
 */
export class AplicarReduccionRpDto {
  @ApiProperty({
    description: 'Número de operación o consecutivo de la reducción de RP en SIIF Nación.',
    example: 'RED-RP-2026-4421',
    minLength: 2,
    maxLength: 100,
  })
  @IsNotEmpty({ message: 'El número de operación de reducción en SIIF Nación es obligatorio.' })
  @IsString({ message: 'El número de operación debe ser una cadena de texto.' })
  @Length(2, 100, { message: 'El número de operación debe tener entre 2 y 100 caracteres.' })
  numeroOperacionReduccion: string;

  @ApiProperty({
    description: 'Fecha de la reducción presupuestal en SIIF Nación (formato YYYY-MM-DD o ISO).',
    example: '2026-10-19',
  })
  @IsNotEmpty({ message: 'La fecha de la reducción presupuestal es obligatoria.' })
  @IsString({ message: 'La fecha debe ser una cadena válida.' })
  fechaReduccion: string;

  @ApiProperty({
    description: 'Valor total reducido o liberado del Registro Presupuestal.',
    example: 850000,
  })
  @IsNotEmpty({ message: 'El valor reducido es obligatorio.' })
  @IsNumber({}, { message: 'El valor reducido debe ser un número válido.' })
  @IsPositive({ message: 'El valor reducido debe ser mayor a cero.' })
  valorReducido: number;

  @ApiPropertyOptional({
    description: 'Observaciones presupuestales de la reducción del RP.',
    example: 'Reducción total de recursos comprometidos por revocatoria de comisión autorizada.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  observaciones?: string;

  @ApiPropertyOptional({
    description: 'Soporte PDF de la reducción expedida en SIIF Nación (Base64 opcional).',
    example: 'data:application/pdf;base64,JVBERi0xLjQK...',
  })
  @IsOptional()
  @IsString()
  soporteReduccionPdfBase64?: string;

  @ApiPropertyOptional({
    description: 'Nombre del archivo PDF de soporte de reducción.',
    example: 'Soporte_Reduccion_RP_4421.pdf',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @Length(0, 255)
  nombreArchivoSoporte?: string;
}
