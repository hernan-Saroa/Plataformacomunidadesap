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

export class ExpedirRpDto {
  @ApiProperty({
    description: 'Número oficial del Registro Presupuestal expedido en SIIF Nación.',
    example: '24567',
  })
  @IsNotEmpty({ message: 'El número de RP es obligatorio.' })
  @IsString({ message: 'El número de RP debe ser una cadena de texto.' })
  @MaxLength(100)
  numeroRp: string;

  @ApiProperty({
    description: 'Fecha oficial de expedición del RP en SIIF Nación (formato YYYY-MM-DD o ISO).',
    example: '2026-09-16',
  })
  @IsNotEmpty({ message: 'La fecha del RP es obligatoria.' })
  @IsDateString({}, { message: 'La fecha del RP debe tener un formato de fecha válido (YYYY-MM-DD).' })
  fechaRp: string;

  @ApiProperty({
    description: 'Valor total de recursos comprometidos en el RP (mayor a cero).',
    example: 1850000,
  })
  @IsNotEmpty({ message: 'El valor comprometido es obligatorio.' })
  @IsNumber({}, { message: 'El valor comprometido debe ser un número.' })
  @IsPositive({ message: 'El valor comprometido debe ser un valor positivo mayor a 0.' })
  valorComprometido: number;

  @ApiProperty({
    description: 'Rubro presupuestal institucional asignado en SIIF Nación.',
    example: 'C-2101-0100-0-2101010-02-00-00',
  })
  @IsNotEmpty({ message: 'El rubro presupuestal es obligatorio.' })
  @IsString({ message: 'El rubro presupuestal debe ser una cadena de texto.' })
  @MaxLength(100)
  rubro: string;

  @ApiPropertyOptional({
    description:
      'Código completo de nomenclatura Fecha_RP_Número (ej. 2026-09-16_RP_24567 o 20260916_RP_24567). Si no se suministra, el sistema lo genera automáticamente.',
    example: '2026-09-16_RP_24567',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-?\d{2}-?\d{2}_RP_[A-Za-z0-9\-_]+$/i, {
    message: 'La nomenclatura del RP debe respetar el formato Fecha_RP_Número (ej. 2026-09-16_RP_12345 o 20260916_RP_12345).',
  })
  codigoRp?: string;

  @ApiPropertyOptional({
    description: 'Ruta o nombre del archivo soporte PDF del RP.',
    example: '20260916_RP_24567.pdf',
  })
  @IsOptional()
  @IsString()
  soporteRpPath?: string;

  @ApiPropertyOptional({
    description: 'Alias alternativo para rubro presupuestal.',
  })
  @IsOptional()
  @IsString()
  rubroPresupuestal?: string;

  @ApiPropertyOptional({
    description: 'Código OTP para validación de firma digital.',
    example: '123456',
  })
  @IsOptional()
  @IsString()
  otp?: string;

  @ApiPropertyOptional({
    description: 'Identificador de verificación OTP.',
  })
  @IsOptional()
  @IsString()
  verificationId?: string;

  @ApiPropertyOptional({
    description: 'Identificador del certificado digital institucional.',
  })
  @IsOptional()
  @IsString()
  certificadoId?: string;

  @ApiPropertyOptional({
    description: 'Hash SHA-256 de la transacción/firma.',
  })
  @IsOptional()
  @IsString()
  hashSha256?: string;

  @ApiPropertyOptional({
    description: 'Observaciones o notas adicionales de la expedición.',
  })
  @IsOptional()
  @IsString()
  observaciones?: string;

  @ApiPropertyOptional({
    description: 'Estampa visual o imagen de firma en base64.',
  })
  @IsOptional()
  @IsString()
  firmaImagen?: string;
}
