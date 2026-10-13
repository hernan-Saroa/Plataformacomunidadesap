import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class ActualizarRegionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nombre?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  unidadContratacion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  activa?: boolean;
}

/** Lo único que el archivo no dice: a qué año pertenece. */
export class CargarPaaDto {
  @ApiProperty({ example: 2027 })
  @Type(() => Number)
  @IsInt({ message: 'La vigencia es un año' })
  @Min(2000)
  @Max(2100)
  anio: number;
}

export class DescartarVersionDto {
  @ApiProperty({ description: 'Por qué no se activa' })
  @IsString()
  @IsNotEmpty({ message: 'Hay que decir por qué se descarta la versión' })
  @MaxLength(2000)
  motivo: string;
}

export class CampoVisibleDto {
  @ApiProperty({ example: 'valor_total' })
  @IsString()
  @MaxLength(80)
  clave: string;

  @ApiProperty()
  @IsBoolean()
  visible: boolean;

  @ApiPropertyOptional({ description: 'Nombre que verá quien crea el proceso; vacío = el del formato' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  etiqueta?: string | null;
}

export class GuardarCamposDto {
  /** En el orden en que se mostrarán. */
  @ApiProperty({ type: [CampoVisibleDto] })
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => CampoVisibleDto)
  campos: CampoVisibleDto[];
}

export class BuscarLineasDto {
  @ApiProperty()
  @IsUUID()
  region: string;

  @ApiPropertyOptional({ description: 'Año; por omisión la vigencia vigente del documento de la región' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  anio?: number;

  @ApiPropertyOptional({ description: 'Código u objeto' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pagina?: number;
}

export class LineasDeVersionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  region?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pagina?: number;
}

export class DecidirRevisionPaaDto {
  @ApiProperty({ enum: ['CONTINUAR', 'DEVOLVER', 'MIGRAR', 'CANCELAR'] })
  @IsIn(['CONTINUAR', 'DEVOLVER', 'MIGRAR', 'CANCELAR'], { message: 'La decisión no es válida' })
  decision: 'CONTINUAR' | 'DEVOLVER' | 'MIGRAR' | 'CANCELAR';

  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'La justificación es obligatoria: es lo que queda en el expediente' })
  @MaxLength(4000)
  justificacion: string;

  /** Al migrar: la línea del año nuevo que el encargado eligió. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  lineaDestinoId?: string;
}
