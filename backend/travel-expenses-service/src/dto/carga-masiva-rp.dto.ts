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

export class ItemCargaMasivaRpDto {
  @ApiPropertyOptional({
    description: 'ID UUID de la solicitud de comisión en Plataforma ESAP.',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsString()
  solicitudId?: string;

  @ApiPropertyOptional({
    description: 'Consecutivo radicado de la comisión (ej. COM-2026-0001).',
    example: 'COM-2026-0001',
  })
  @IsOptional()
  @IsString()
  consecutivoUnico?: string;

  @ApiProperty({
    description: 'Número de RP en SIIF Nación.',
    example: '24567',
  })
  @IsNotEmpty({ message: 'El número de RP es obligatorio.' })
  @IsString()
  numeroRp: string;

  @ApiProperty({
    description: 'Fecha de expedición del RP (formato YYYY-MM-DD o ISO).',
    example: '2026-09-16',
  })
  @IsNotEmpty({ message: 'La fecha del RP es obligatoria.' })
  @IsString()
  fechaRp: string;

  @ApiProperty({
    description: 'Valor comprometido en el RP.',
    example: 1500000,
  })
  @IsNotEmpty({ message: 'El valor comprometido es obligatorio.' })
  @IsNumber()
  @IsPositive({ message: 'El valor comprometido debe ser positivo.' })
  valorComprometido: number;

  @ApiProperty({
    description: 'Rubro presupuestal.',
    example: 'C-2101-0100-0-2101010-02-00-00',
  })
  @IsNotEmpty({ message: 'El rubro presupuestal es obligatorio.' })
  @IsString()
  rubro: string;

  @ApiPropertyOptional({
    description: 'Nomenclatura Fecha_RP_Número opcional. Si no se indica, se autogenera.',
    example: '2026-09-16_RP_24567',
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

export class CargaMasivaRpDto {
  @ApiProperty({
    description: 'Listado de registros presupuestales a procesar de forma masiva.',
    type: [ItemCargaMasivaRpDto],
  })
  @IsArray({ message: 'Los items deben ser un arreglo de registros.' })
  @ValidateNested({ each: true })
  @Type(() => ItemCargaMasivaRpDto)
  items: ItemCargaMasivaRpDto[];
}
