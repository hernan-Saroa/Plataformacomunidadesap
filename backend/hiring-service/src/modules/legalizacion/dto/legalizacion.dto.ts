import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { plainToInstance, Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class AmparoDto {
  @ApiProperty({ description: 'Código del tipo de amparo' })
  @IsString()
  @IsNotEmpty({ message: 'Cada amparo necesita su tipo de cobertura' })
  @MaxLength(60)
  tipo: string;

  @ApiProperty({ description: 'Valor asegurado en pesos' })
  @Transform(({ value }) => (typeof value === 'string' ? Number(value) : value))
  @IsNumber({}, { message: 'El valor asegurado debe ser un número' })
  @IsPositive({ message: 'El valor asegurado debe ser mayor que cero' })
  valorAsegurado: number;

  @ApiProperty({ description: 'Inicio de la vigencia (YYYY-MM-DD)' })
  @IsDateString({}, { message: 'La vigencia debe tener el formato YYYY-MM-DD' })
  vigenciaDesde: string;

  @ApiProperty({ description: 'Fin de la vigencia (YYYY-MM-DD)' })
  @IsDateString({}, { message: 'La vigencia debe tener el formato YYYY-MM-DD' })
  vigenciaHasta: string;
}

export class CargarGarantiaDto {
  @ApiProperty({ description: 'Aseguradora que expide la póliza' })
  @IsString()
  @IsNotEmpty({ message: 'Registra la aseguradora que expide la póliza' })
  @MaxLength(200)
  aseguradora: string;

  @ApiProperty({ description: 'Número de la póliza' })
  @IsString()
  @IsNotEmpty({ message: 'Registra el número de la póliza' })
  @MaxLength(80)
  numeroPoliza: string;

  /**
   * Los amparos llegan como texto JSON dentro del multipart, porque la petición
   * lleva también la póliza y `FormData` no transporta arreglos de objetos.
   *
   * `plainToInstance` y no `JSON.parse` a secas: el resultado del Transform es
   * el valor final, `@Type` ya no lo convierte, y sin instancias reales el
   * `whitelist` del ValidationPipe despoja cada amparo de todos sus campos —
   * llegarían a la base como nulos.
   */
  @ApiProperty({
    description: 'Amparos de la póliza, como JSON',
    example:
      '[{"tipo":"CUMPLIMIENTO","valorAsegurado":5000000,"vigenciaDesde":"2026-01-01","vigenciaHasta":"2027-01-01"}]',
  })
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    try {
      return plainToInstance(AmparoDto, JSON.parse(value));
    } catch {
      // Se devuelve el string para que la validación lo rechace con un mensaje
      // de negocio, en vez de reventar aquí con un error de sintaxis.
      return value;
    }
  })
  @IsArray({ message: 'Los amparos deben venir como una lista' })
  @ArrayMinSize(1, {
    message: 'Una póliza sin amparos no cubre nada: registra al menos una cobertura',
  })
  @ValidateNested({ each: true })
  @Type(() => AmparoDto)
  amparos: AmparoDto[];
}

export class RechazarGarantiaDto {
  @ApiProperty({ description: 'Por qué se devuelve la póliza' })
  @IsString()
  @IsNotEmpty({ message: 'Explica por qué se devuelve la póliza' })
  @MinLength(10, {
    message: 'El motivo debe decir qué corregir, no una palabra suelta',
  })
  @MaxLength(1000)
  motivo: string;
}

export class RegistrarArlDto {
  @ApiProperty({ description: 'Quién realizó la afiliación', enum: ['ENTIDAD', 'CONTRATISTA'] })
  @IsIn(['ENTIDAD', 'CONTRATISTA'], {
    message: 'La afiliación la realiza la ENTIDAD o el CONTRATISTA',
  })
  afiliadoPor: 'ENTIDAD' | 'CONTRATISTA';

  @ApiProperty({ description: 'Administradora de riesgos laborales' })
  @IsString()
  @IsNotEmpty({ message: 'Registra la administradora de riesgos laborales' })
  @MaxLength(200)
  administradora: string;

  @ApiPropertyOptional({ description: 'Número de la afiliación' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  numeroAfiliacion?: string;

  @ApiProperty({ description: 'Fecha de la afiliación (YYYY-MM-DD)' })
  @IsDateString({}, { message: 'La fecha de afiliación debe tener el formato YYYY-MM-DD' })
  fechaAfiliacion: string;
}
