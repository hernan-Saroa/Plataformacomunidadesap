import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

import { TipoSubsanacion } from '../../../entities/subsanacion.entity';

export class RegistrarSubsanacionDto {
  @ApiProperty({ description: 'Oferta a la que se refiere lo presentado' })
  @IsUUID('4', { message: 'La oferta se identifica con el id de la que registró el proceso' })
  oferenteId: string;

  /**
   * Subsanación u observación.
   *
   * No es un matiz: la primera aporta lo que faltaba y puede cambiar la
   * habilitación, la segunda cuestiona la evaluación. Se responden distinto, y
   * con una sola etiqueta habría que adivinar cuál es cuál.
   */
  @ApiProperty({ enum: ['SUBSANACION', 'OBSERVACION'] })
  @IsIn(['SUBSANACION', 'OBSERVACION'], {
    message: 'Di si es una subsanación —aporta lo que faltaba— o una observación al informe',
  })
  tipo: TipoSubsanacion;

  @ApiProperty({ description: 'Quién la presenta, tal como firma el escrito' })
  @IsString()
  @IsNotEmpty({ message: 'Di quién presenta el escrito' })
  @MaxLength(200)
  presentadoPor: string;

  @ApiPropertyOptional({ description: 'NIT o cédula de quien presenta' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  identificacion?: string;

  /**
   * Cuándo lo presentó el oferente, no cuándo se registra.
   *
   * Es la que decide si llegó en término: no hay integración con SECOP II, así
   * que el gestor transcribe días después lo que llegó por allá.
   */
  @ApiProperty({ description: 'Fecha en que el oferente lo presentó (YYYY-MM-DD)' })
  @IsISO8601({ strict: true }, { message: 'La fecha de presentación va como YYYY-MM-DD' })
  fechaPresentacion: string;

  @ApiProperty({ description: 'De qué se trata, en una línea' })
  @IsString()
  @IsNotEmpty({ message: 'Ponle un asunto: es lo que se lee en la lista' })
  @MaxLength(300)
  asunto: string;

  @ApiProperty({ description: 'Lo que el oferente dice' })
  @IsString()
  @IsNotEmpty({ message: 'Transcribe lo que presentó el oferente' })
  @MinLength(10, { message: 'El contenido tiene que decir qué presentó el oferente' })
  contenido: string;
}

/**
 * Los booleanos llegan como texto dentro del multipart —la petición puede traer
 * el documento de respuesta— y `FormData` no distingue tipos. Se convierten
 * antes de validar; sin esto `IsBoolean` rechazaría siempre.
 */
const aBooleano = ({ value }: { value: unknown }) => {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
};

export class ResponderSubsanacionDto {
  /**
   * Qué decidió la entidad.
   *
   * Aceptar una subsanación puede cambiar la habilitación y llevar al comité a
   * rectificar su resultado; rechazarla también hay que sustentarla. En los dos
   * casos se dice por qué.
   */
  @ApiProperty({ description: 'True si se acepta lo presentado' })
  @Transform(aBooleano)
  @IsBoolean({ message: 'Di si se acepta o no lo presentado' })
  aceptada: boolean;

  @ApiProperty({ description: 'La respuesta de la entidad' })
  @IsString()
  @IsNotEmpty({ message: 'Escribe la respuesta: es la que se le notifica al oferente' })
  @MinLength(10, { message: 'La respuesta tiene que sustentarse, no basta con aceptar o negar' })
  respuesta: string;
}

export class CerrarTrasladoDto {
  /**
   * Nota de cierre, opcional.
   *
   * Sirve para dejar dicho lo que no cabe en las respuestas: que nadie presentó
   * nada, o que el comité rectificó a raíz de una subsanación aceptada.
   */
  @ApiPropertyOptional({ description: 'Nota de cierre del traslado' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  nota?: string;
}
