import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Alta o ajuste de un tipo de póliza (145).
 *
 * El código es la llave y no se cambia: las garantías ya registradas lo
 * referencian.
 */
export class GuardarTipoPolizaDto {
  @ApiProperty({ description: 'Código del tipo de póliza. Es la llave y no se cambia.' })
  @IsString()
  @IsNotEmpty({ message: 'El tipo de póliza necesita un código' })
  @MaxLength(60)
  codigo: string;

  @ApiProperty({ description: 'Cómo se llama' })
  @IsString()
  @IsNotEmpty({ message: 'El tipo de póliza necesita un nombre' })
  @MaxLength(200)
  nombre: string;

  @ApiPropertyOptional({ description: 'Qué respalda' })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiPropertyOptional({ description: 'false lo retira; las garantías que lo usaron lo conservan' })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @ApiPropertyOptional({ description: 'Orden en el que se ofrece en la 8.4' })
  @IsOptional()
  @IsInt()
  @Min(1)
  orden?: number;
}

/** Alta o ajuste de un tipo de amparo (cobertura) (145). */
export class GuardarTipoAmparoDto extends GuardarTipoPolizaDto {
  @ApiPropertyOptional({
    description: 'Códigos de los tipos de póliza en los que se ofrece; vacío = en todos',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tiposPoliza?: string[];

  @ApiPropertyOptional({
    description:
      'Si sigue amparando después de liquidado el contrato; el cierre definitivo espera a que venza',
  })
  @IsOptional()
  @IsBoolean()
  amparaTrasElContrato?: boolean;
}
