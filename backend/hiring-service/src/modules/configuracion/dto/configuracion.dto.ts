import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
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

/**
 * Formato institucional que se ofrece en una actividad.
 *
 * El archivo llega aparte, como multipart: aqui viajan los datos que lo
 * identifican en el Sistema Integrado de Gestion y dicen donde aplica.
 */
export class GuardarPlantillaDto {
  @ApiProperty({ example: 'BS-FO-047', description: 'Codigo del formato en el SIG.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  codigo: string;

  @ApiProperty({ example: 'Aviso de convocatoria' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(400)
  nombre: string;

  @ApiPropertyOptional({
    example: '3.1',
    description:
      'Actividad en la que se ofrece. Vacio deja el formato en la biblioteca, ' +
      'listo para asignarse despues.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  numeral?: string;

  // La version no se recibe: la calcula el servicio a partir de las que ya
  // existen con ese codigo. Ver guardarPlantilla.

  @ApiPropertyOptional({ description: 'Fecha en que el SIG aprobo esta version.' })
  @IsOptional()
  @IsString()
  fechaAprobacion?: string;

  @ApiPropertyOptional({
    description: 'Modalidades a las que aplica. Vacio = todas.',
    example: ['LICITACION_PUBLICA'],
  })
  @IsOptional()
  // El alta del formato viaja como multipart porque lleva el archivo, y
  // `FormData` no transporta arreglos: la lista llega como texto JSON. Sin
  // convertirla antes de validar, `IsArray` rechaza siempre.
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    try {
      return JSON.parse(value);
    } catch {
      // Se devuelve el string para que la validacion lo rechace con un mensaje
      // de negocio en vez de reventar aqui con un error de sintaxis.
      return value;
    }
  })
  @IsArray()
  modalidades?: string[];
}

/** Retirar un formato de circulacion o volver a ofrecerlo. */
export class EstadoPlantillaDto {
  @ApiPropertyOptional({
    description: 'false retira el formato; los procesos que ya lo usaron lo conservan.',
  })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  // Corregir la ficha es el mismo gesto que retirarla: se edita lo que esta
  // mal escrito sin volver a subir el archivo, que no ha cambiado.
  @ApiPropertyOptional({ example: 'BS-FO-047' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  codigo?: string;

  @ApiPropertyOptional({ example: 'Aviso de convocatoria' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(400)
  nombre?: string;

  @ApiPropertyOptional({
    example: '3.1',
    description: 'Actividad en la que se ofrece. Vacio lo devuelve a la biblioteca.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  numeral?: string;
}

/** Donde aplica un formato: en que actividad se ofrece y a que modalidades alcanza. */
export class AsignarPlantillaDto {
  @ApiPropertyOptional({
    example: '3.1',
    description: 'Actividad donde se ofrecera. Vacio lo devuelve a la biblioteca.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  numeral?: string;

  @ApiPropertyOptional({
    example: ['MINIMA_CUANTIA'],
    description: 'Modalidades a las que alcanza. Lista vacia significa todas.',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  modalidades?: string[];
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

/**
 * Alta o ajuste de una tipologia de contrato (EFDS-1161).
 *
 * La historia habla de 16 tipologias sin enumerarlas, asi que la lista sembrada
 * es un punto de partida: Contratacion completa la suya desde la configuracion
 * en vez de pedir una migracion cada vez.
 */
export class GuardarTipologiaDto {
  @ApiProperty({ description: 'Codigo de la tipologia. Es la llave y no se cambia.' })
  @IsString()
  @IsNotEmpty({ message: 'La tipologia necesita un codigo' })
  @MaxLength(60)
  codigo: string;

  @ApiProperty({ description: 'Como se llama en el catalogo de la entidad' })
  @IsString()
  @IsNotEmpty({ message: 'La tipologia necesita un nombre' })
  @MaxLength(200)
  nombre: string;

  @ApiPropertyOptional({ description: 'Que se contrata con esta tipologia' })
  @IsOptional()
  @IsString()
  descripcion?: string;

  /** Lo consume la legalizacion (EFDS-1164) al exigir polizas. */
  @ApiPropertyOptional({ description: 'Si los contratos de esta tipologia exigen garantias' })
  @IsOptional()
  @IsBoolean()
  exigeGarantias?: boolean;

  @ApiPropertyOptional({ description: 'false la retira; los contratos que la usaron la conservan' })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @ApiPropertyOptional({ description: 'Orden en el que se ofrece al gestor' })
  @IsOptional()
  @IsInt()
  @Min(1)
  orden?: number;
}
