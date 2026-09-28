import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsPositive,
  IsOptional,
  Matches,
  MaxLength,
  IsDateString,
} from 'class-validator';

/**
 * DTO para la expedición y registro individual de RP en SIIF Nación.
 * Historia de Usuario: [RF-PRE-001] Etapa 7 - Expedir RP en SIIF Nación (COMPROMETIDA)
 */
export class IssueRpDto {
  @ApiProperty({
    description: 'Número oficial del Registro Presupuestal (RP) expedido en SIIF Nación.',
    example: '12345',
  })
  @IsNotEmpty({ message: 'El número de RP es obligatorio.' })
  @IsString({ message: 'El número de RP debe ser una cadena de texto.' })
  @MaxLength(50)
  numeroRp: string;

  @ApiProperty({
    description: 'Fecha oficial de expedición del RP en formato fecha ISO YYYY-MM-DD.',
    example: '2026-09-16',
  })
  @IsNotEmpty({ message: 'La fecha del RP es obligatoria.' })
  @IsDateString({}, { message: 'La fecha del RP debe cumplir con el formato fecha ISO YYYY-MM-DD.' })
  fechaRp: string;

  @ApiProperty({
    description: 'Valor total comprometido en el RP (debe ser un número positivo mayor a 0).',
    example: 1850000,
  })
  @IsNotEmpty({ message: 'El valor comprometido es obligatorio.' })
  @IsNumber({}, { message: 'El valor comprometido debe ser un número.' })
  @IsPositive({ message: 'El valor comprometido debe ser un número positivo mayor a 0.' })
  valorComprometido: number;

  @ApiProperty({
    description: 'Rubro presupuestal institucional asignado en SIIF Nación.',
    example: 'C-2101-0100-0-2101010-02-00-00',
  })
  @IsNotEmpty({ message: 'El rubro presupuestal es obligatorio.' })
  @IsString({ message: 'El rubro presupuestal debe ser una cadena de texto.' })
  @MaxLength(100)
  rubroPresupuestal: string;

  @ApiPropertyOptional({
    description: 'Alias alternativo para el rubro presupuestal.',
    example: 'C-2101-0100-0-2101010-02-00-00',
  })
  @IsOptional()
  @IsString()
  rubro?: string;

  @ApiPropertyOptional({
    description:
      'Ruta o nombre del archivo soporte PDF del RP. Debe cumplir con el patrón YYYYMMDD_RP_Numero.pdf o Fecha_RP_Número (ej. 20260916_RP_12345.pdf).',
    example: '20260916_RP_12345.pdf',
  })
  @IsOptional()
  @IsString()
  @Matches(
    /^.*(\d{4}-?\d{2}-?\d{2})_RP_([A-Za-z0-9\-_]+)(\.pdf)?$/i,
    {
      message:
        'El archivo soporte o nomenclatura debe cumplir con la regla Fecha_RP_Número (ejemplo: 20260916_RP_12345.pdf o 2026-09-16_RP_12345.pdf).',
    },
  )
  soporteRpPath?: string;

  @ApiPropertyOptional({
    description: 'Código completo de nomenclatura Fecha_RP_Número (autogenerado si no se envía).',
    example: '2026-09-16_RP_12345',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-?\d{2}-?\d{2}_RP_[A-Za-z0-9\-_]+$/i, {
    message: 'La nomenclatura del RP debe respetar el formato Fecha_RP_Número.',
  })
  codigoRp?: string;

  @ApiPropertyOptional({
    description: 'Observaciones o notas adicionales del registro presupuestal.',
    example: 'Expedido en SIIF Nación en firme conforme a CDP vigente.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  observaciones?: string;
}
