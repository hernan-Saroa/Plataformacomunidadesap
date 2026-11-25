import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsDateString, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

import type { TipoLiquidacion } from '../../../entities/acta-liquidacion.entity';
import { ACCIONES_LIQUIDACION } from '../reglas';
import type { AccionLiquidacion } from '../../../entities/tramite-liquidacion.entity';

const TIPOS_ACTA: TipoLiquidacion[] = ['BILATERAL', 'UNILATERAL'];

export class AsignarLiquidacionDto {
  @ApiProperty({ description: 'Cuenta del abogado (id de usuario)' })
  @IsString()
  @IsNotEmpty({ message: 'Elige al abogado' })
  abogadoId: string;
}

export class DecidirLiquidacionDto {
  @ApiProperty({ enum: ACCIONES_LIQUIDACION })
  @IsIn(ACCIONES_LIQUIDACION, { message: 'La decisión es aprobar o devolver' })
  accion: AccionLiquidacion;

  @ApiPropertyOptional({ description: 'Obligatorias al devolver: qué hay que corregir' })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  observaciones?: string;
}

/** Devolver al área: el asignador antes de asignar, o el abogado en el cierre. */
export class DevolverAlAreaDto {
  @ApiProperty({ example: 'Falta el memorando firmado por el jefe del área.' })
  @IsString()
  @IsNotEmpty({ message: 'Di qué hay que corregir para devolverla' })
  @MaxLength(4000)
  observaciones: string;
}

export class ReenviarLiquidacionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  observaciones?: string;
}

/** El acta firmada que sube el área: es la 10.2 de siempre. */
export class PerfeccionarLiquidacionDto {
  @ApiProperty({ enum: TIPOS_ACTA })
  @IsIn(TIPOS_ACTA, { message: 'La liquidación es bilateral, de común acuerdo, o unilateral, por acto de la entidad' })
  tipo: TipoLiquidacion;

  @ApiProperty({ example: '2026-11-26' })
  @IsDateString({}, { message: 'La fecha del acta debe tener el formato AAAA-MM-DD' })
  fechaActa: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @IsBoolean()
  pazYSalvo?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  observaciones?: string;
}

/** La evidencia de SECOP II: de la liquidación publicada o del cierre (PSPAG). */
export class EvidenciaSecopDto {
  @ApiProperty({ example: '2026-11-26', description: 'Día de la publicación o del cierre en SECOP II' })
  @IsDateString({}, { message: 'La fecha debe tener el formato AAAA-MM-DD' })
  fecha: string;

  @ApiPropertyOptional({ example: 'CO1.PCCNTR.1234567' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  secopNumero?: string;

  @ApiPropertyOptional({ example: 'https://community.secop.gov.co/...' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  secopUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  observaciones?: string;
}

export class DesistirLiquidacionDto {
  @ApiProperty({ example: 'El contrato tiene una prórroga en curso.' })
  @IsString()
  @IsNotEmpty({ message: 'Di por qué se desiste' })
  @MaxLength(2000)
  motivo: string;
}
