import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Max,
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

  @ApiPropertyOptional({
    example: 5,
    description: 'Días hábiles previstos para completarla. Nulo la deja sin plazo.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(999)
  plazoDias?: number | null;

  @ApiPropertyOptional({
    example: 'Director de Contratación',
    description: 'Cargo que responde por la actividad, no la persona que hoy lo ocupa.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  responsableCargo?: string | null;

  @ApiPropertyOptional({
    example: 2,
    description: 'Cuántos días antes del vencimiento avisar. Nulo la deja sin aviso.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  alertaDiasAntes?: number | null;
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

  @ApiPropertyOptional({
    description: 'Cuando aplica: [{campo, operador, valor}]. Vacio = siempre.',
  })
  @IsOptional()
  @IsArray()
  condiciones?: any[];

  @ApiPropertyOptional({ description: 'Que hace: [{accion, objetivo, valor}].' })
  @IsOptional()
  @IsArray()
  acciones?: any[];

  @ApiPropertyOptional({ enum: ['AND', 'OR'], default: 'AND' })
  @IsOptional()
  @IsIn(['AND', 'OR'])
  conector?: 'AND' | 'OR';
}

/**
 * Texto que el gestor lee en el formulario.
 *
 * El `codigo` queda fuera a propósito: lo referencian las reglas y los datos
 * ya guardados, así que renombrarlo dejaría huérfano todo lo anterior.
 */
export class ActualizarCampoDto {
  @ApiProperty({ example: 'Objeto del contrato' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  etiqueta: string;

  @ApiPropertyOptional({ description: 'Texto de apoyo bajo el campo.' })
  @IsOptional()
  @IsString()
  ayuda?: string;

  @ApiPropertyOptional({ description: 'Agrupa campos en el formulario.' })
  @IsOptional()
  @IsString()
  grupo?: string;

  @ApiPropertyOptional({
    description: 'Si es falso, el gestor puede terminar la actividad sin diligenciarlo.',
  })
  @IsOptional()
  @IsBoolean()
  obligatorio?: boolean;

  @ApiPropertyOptional({ description: 'Un campo inactivo deja de pedirse.' })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

/** Los tipos que la pantalla sabe pedir. */
export const TIPOS_CAMPO = [
  'archivo',
  'texto_largo',
  'fecha',
  'casilla',
  'responsable',
] as const;

/**
 * Algo nuevo que la actividad le pedira al gestor.
 *
 * El `codigo` no viene del cliente: lo deriva el servicio del numeral y del
 * tipo, porque es la referencia con la que se guardan los datos diligenciados
 * y dejarlo en manos de quien configura permitiria chocar con uno existente.
 */
export class CrearCampoDto {
  @ApiProperty({ enum: TIPOS_CAMPO })
  @IsIn(TIPOS_CAMPO as unknown as string[])
  tipo: string;

  @ApiProperty({ example: 'Documento firmado' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  etiqueta: string;

  @ApiPropertyOptional({ description: 'Texto de apoyo bajo el campo.' })
  @IsOptional()
  @IsString()
  ayuda?: string;
}

/** Datos con los que simular el formulario. */
export class SimularDto {
  @ApiProperty({ example: 'CONTRATACION_DIRECTA' })
  @IsString()
  @IsNotEmpty()
  modalidad: string;

  @ApiPropertyOptional({ description: 'Valores del formulario a esa altura.' })
  @IsOptional()
  @IsObject()
  datos?: Record<string, any>;
}
