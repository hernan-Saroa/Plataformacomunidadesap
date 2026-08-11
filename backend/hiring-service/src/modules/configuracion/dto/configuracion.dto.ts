import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export const TIPOS_REGLA = [
  'CAMPO_OBLIGATORIO',
  'DOCUMENTO_REQUERIDO',
  'RANGO_VALOR',
  'PLAZO_MINIMO',
  'BLOQUEA_AVANCE',
  'REGLA_DERIVADA',
] as const;

/** Texto de la actividad: nombre, descripción y si sigue vigente. */
export class ActualizarActividadDto {
  @ApiProperty({ example: 'Elaboración de estudios previos' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  nombre: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiPropertyOptional({ description: 'Una actividad derogada deja de instanciarse.' })
  @IsOptional()
  @IsBoolean()
  activa?: boolean;
}

/** Marca o levanta la exclusión de una actividad en una modalidad. */
export class AplicabilidadDto {
  @ApiProperty({ example: 'LICITACION_PUBLICA' })
  @IsString()
  @IsNotEmpty()
  modalidad: string;

  @ApiProperty({ description: 'false registra la exclusión; true la levanta.' })
  @IsBoolean()
  aplica: boolean;

  @ApiPropertyOptional({ description: 'Por qué no aplica. Queda en el expediente.' })
  @IsOptional()
  @IsString()
  motivo?: string;
}

export class GuardarReglaDto {
  @ApiPropertyOptional({ description: 'Vacío = aplica a todas las modalidades.' })
  @IsOptional()
  @IsString()
  modalidad?: string | null;

  @ApiProperty({ enum: TIPOS_REGLA })
  @IsIn(TIPOS_REGLA as unknown as string[])
  tipo: string;

  @ApiProperty({
    description: 'Su forma depende del tipo: `codigo`, `max`, `dias`, `tipoDocumento`…',
    example: { codigo: 'objeto_contratar' },
  })
  @IsObject()
  config: Record<string, any>;

  @ApiPropertyOptional({ description: 'Lo que ve el gestor cuando la regla no se cumple.' })
  @IsOptional()
  @IsString()
  mensaje?: string;

  @ApiPropertyOptional({ default: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  orden?: number;
}
