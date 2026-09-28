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
 * Lo que se puede decir de un documento que la actividad pide (EFDS-2066).
 *
 * El código no se recibe: lo arma el servicio a partir del nombre, y no se
 * vuelve a cambiar porque las entregas lo citan.
 */
class CamposDocumentoRequerido {
  @ApiPropertyOptional({
    example: 'Memorando firmado por el jefe del área que remite el proceso a la Dirección.',
    description: 'Qué debe contener o para qué sirve. Lo lee quien lo va a cargar.',
  })
  @IsOptional()
  @IsString()
  descripcion?: string | null;

  @ApiPropertyOptional({
    example: 'BS-FO-047',
    description:
      'Código del formato de la biblioteca que se descarga para diligenciarlo. Se ofrece siempre su versión activa más reciente. null lo deja sin plantilla.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  plantillaCodigo?: string | null;

  @ApiPropertyOptional({ description: 'Si traba el avance de la actividad mientras falte.' })
  @IsOptional()
  @IsBoolean()
  obligatorio?: boolean;

  @ApiPropertyOptional({
    example: ['CONTRATACION_DIRECTA'],
    description: 'Modalidades a las que se pide. Lista vacía significa todas.',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  modalidades?: string[];

  @ApiPropertyOptional({
    example: ['Prestación de servicios profesionales y de apoyo a la gestión'],
    description: 'Tipologías contractuales (3.1) a las que se pide. Lista vacía significa todas.',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tipologias?: string[];

  @ApiPropertyOptional({ description: 'Posición en la lista de la actividad.' })
  @IsOptional()
  @IsInt()
  @Min(0)
  orden?: number;
}

export class CrearDocumentoRequeridoDto extends CamposDocumentoRequerido {
  @ApiProperty({ example: '3.1', description: 'Actividad que lo pide.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  numeral: string;

  @ApiProperty({ example: 'Memorando de solicitud firmado' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  nombre: string;
}

export class ActualizarDocumentoRequeridoDto extends CamposDocumentoRequerido {
  @ApiPropertyOptional({ example: 'Memorando de solicitud firmado' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  nombre?: string;

  @ApiPropertyOptional({
    description:
      'false lo deja de pedir sin borrarlo: un proceso anterior debe poder mostrar qué se le pidió.',
  })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

export class CopiarDocumentoRequeridoDto {
  @ApiProperty({ example: '5.4', description: 'Actividad a la que se copia.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  numeral: string;
}
