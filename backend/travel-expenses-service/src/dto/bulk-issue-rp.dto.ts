import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';

export class ItemBulkIssueRpDto {
  @ApiPropertyOptional({
    description: 'ID UUID de la solicitud de comisión en Plataforma ESAP.',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsString()
  solicitudId?: string;

  @ApiPropertyOptional({
    description: 'Consecutivo radicado de la comisión (solicitud_consecutivo, ej. COM-2026-0001).',
    example: 'COM-2026-0001',
  })
  @IsOptional()
  @IsString()
  solicitud_consecutivo?: string;

  @ApiPropertyOptional({
    description: 'Consecutivo único de la comisión (alias camelCase).',
    example: 'COM-2026-0001',
  })
  @IsOptional()
  @IsString()
  consecutivoUnico?: string;

  @ApiProperty({
    description: 'Número de RP en SIIF Nación.',
    example: '12345',
  })
  @IsNotEmpty({ message: 'El número de RP es obligatorio.' })
  @IsString()
  numeroRp: string;

  @ApiPropertyOptional({
    description: 'Alias snake_case para número de RP.',
    example: '12345',
  })
  @IsOptional()
  @IsString()
  numero_rp?: string;

  @ApiProperty({
    description: 'Fecha de expedición del RP (formato YYYY-MM-DD o ISO).',
    example: '2026-09-16',
  })
  @IsNotEmpty({ message: 'La fecha del RP es obligatoria.' })
  @IsString()
  fechaRp: string;

  @ApiPropertyOptional({
    description: 'Alias snake_case para fecha del RP.',
    example: '2026-09-16',
  })
  @IsOptional()
  @IsString()
  fecha_rp?: string;

  @ApiProperty({
    description: 'Valor comprometido en el RP (número positivo mayor a 0).',
    example: 1850000,
  })
  @IsNotEmpty({ message: 'El valor comprometido es obligatorio.' })
  @IsNumber()
  @IsPositive({ message: 'El valor comprometido debe ser positivo.' })
  valorComprometido: number;

  @ApiPropertyOptional({
    description: 'Alias snake_case para valor comprometido.',
    example: 1850000,
  })
  @IsOptional()
  @IsNumber()
  valor_comprometido?: number;

  @ApiPropertyOptional({
    description: 'Rubro presupuestal institucional.',
    example: 'C-2101-0100-0-2101010-02-00-00',
  })
  @IsOptional()
  @IsString()
  rubroPresupuestal?: string;

  @ApiPropertyOptional({
    description: 'Alias rubro presupuestal.',
    example: 'C-2101-0100-0-2101010-02-00-00',
  })
  @IsOptional()
  @IsString()
  rubro?: string;

  @ApiPropertyOptional({
    description: 'Ruta o nombre del archivo soporte PDF del RP.',
    example: '20260916_RP_12345.pdf',
  })
  @IsOptional()
  @IsString()
  soporteRpPath?: string;

  @ApiPropertyOptional({
    description: 'Nomenclatura Fecha_RP_Número opcional. Si no se indica, se autogenera.',
    example: '2026-09-16_RP_12345',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-?\d{2}-?\d{2}_RP_[A-Za-z0-9\-_]+$/i, {
    message: 'La nomenclatura del RP debe respetar el formato Fecha_RP_Número.',
  })
  codigoRp?: string;

  @ApiPropertyOptional({
    description: 'Observaciones de la expedición.',
    example: 'Carga masiva SIIF.',
  })
  @IsOptional()
  @IsString()
  observaciones?: string;
}

export class BulkIssueRpDto {
  @ApiProperty({
    description: 'Listado de comisiones y RPs a registrar masivamente.',
    type: [ItemBulkIssueRpDto],
  })
  @IsArray({ message: 'Los items de carga masiva deben ser un arreglo.' })
  @ValidateNested({ each: true })
  @Type(() => ItemBulkIssueRpDto)
  items: ItemBulkIssueRpDto[];
}
