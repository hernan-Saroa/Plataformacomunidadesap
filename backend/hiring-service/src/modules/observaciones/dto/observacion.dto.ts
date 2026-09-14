import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * Los campos llegan por multipart junto con el soporte, así que todo entra como
 * texto: `"true"` no es `true` hasta que alguien lo convierte.
 */
const aBooleano = () =>
  Transform(({ value }) => (typeof value === 'string' ? value === 'true' : value));

export class RegistrarObservacionDto {
  @ApiProperty({ description: 'Persona o empresa que presentó la observación' })
  @IsString()
  @IsNotEmpty({ message: 'Indica quién presentó la observación' })
  @MaxLength(200)
  presentadoPor: string;

  /** Opcional: una observación anónima igual hay que responderla. */
  @ApiPropertyOptional({ description: 'NIT o cédula de quien la presentó' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  identificacion?: string;

  /**
   * La fecha en que el interesado la presentó, no la del registro: es la que
   * decide si llegó dentro del plazo de publicidad.
   */
  @ApiProperty({ description: 'Fecha de presentación (YYYY-MM-DD)', example: '2026-08-14' })
  @IsISO8601({ strict: true }, { message: 'La fecha debe tener formato YYYY-MM-DD' })
  fechaPresentacion: string;

  @ApiProperty({ description: 'Asunto de la observación' })
  @IsString()
  @IsNotEmpty({ message: 'El asunto es obligatorio' })
  @MaxLength(300)
  asunto: string;

  @ApiProperty({ description: 'Texto de la observación tal como se presentó' })
  @IsString()
  @IsNotEmpty({ message: 'El contenido de la observación es obligatorio' })
  contenido: string;
}

export class ResponderObservacionDto {
  @ApiProperty({ description: 'Respuesta de la entidad a la observación' })
  @IsString()
  @IsNotEmpty({ message: 'La respuesta no puede ir vacía' })
  respuesta: string;

  /**
   * Se pide siempre y no se deduce del texto: es lo que justifica una adenda
   * posterior y lo que muestra si la observación sirvió de algo.
   */
  @ApiProperty({
    description: 'Si la observación llevó a modificar el pliego',
    example: false,
  })
  @aBooleano()
  @IsBoolean({ message: 'Indica si la observación modificó el pliego' })
  modificoPliego: boolean;
}
