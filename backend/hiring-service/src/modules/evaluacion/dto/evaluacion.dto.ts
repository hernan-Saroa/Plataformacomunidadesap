import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { FirmaDelMultipart, FirmaOtpDto } from '../../cierre-actividad/dto/firma-otp.dto';

/** De qué es cada archivo del informe preliminar (EFDS-1157). */
export const DIMENSIONES_INFORME = ['CONSOLIDADO', 'JURIDICO', 'TECNICO', 'FINANCIERO'] as const;
export type DimensionInforme = (typeof DIMENSIONES_INFORME)[number];

/** Cómo se nombra cada archivo en el expediente. */
export const NOMBRE_DIMENSION: Record<DimensionInforme, string> = {
  CONSOLIDADO: 'Informe de evaluación preliminar',
  JURIDICO: 'Evaluación jurídica',
  TECNICO: 'Evaluación técnica',
  FINANCIERO: 'Evaluación financiera y económica',
};

/**
 * Las dimensiones llegan en el multipart, una por archivo y en el mismo orden:
 * repetidas como campo o como un JSON. Se normalizan a lista antes de validar.
 */
const aLista = ({ value }: { value: unknown }) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim().startsWith('[')) {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return [value];
};

/**
 * El informe de evaluación preliminar — actividad 6.3 (EFDS-1157).
 *
 * En este punto la evaluación es preliminar: todavía no se sabe qué oferta
 * gana, así que no se registran puntajes ni ganadora. Se carga el informe del
 * comité, en uno o varios archivos, y ese mismo soporte alimenta la 6.4.
 */
export class RegistrarResultadoDto {
  @ApiPropertyOptional({ description: 'Observación sobre el informe preliminar' })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  observacion?: string;

  @ApiPropertyOptional({
    description: 'De qué es cada archivo, en el orden en que se adjuntan',
    enum: DIMENSIONES_INFORME,
    isArray: true,
  })
  @IsOptional()
  @Transform(aLista)
  @IsArray({ message: 'Las dimensiones van como una lista, una por archivo' })
  @IsIn(DIMENSIONES_INFORME as unknown as string[], {
    each: true,
    message: 'Cada archivo es el consolidado o la evaluación jurídica, técnica o financiera y económica',
  })
  dimensiones?: DimensionInforme[];

  /** Solo si la 6.3 quedó configurada con `EXIGE_FIRMA` (EFDS-2070). */
  @ApiPropertyOptional({ description: 'Evidencia de la firma OTP, si la actividad la exige' })
  @IsOptional()
  @FirmaDelMultipart()
  @ValidateNested()
  @Type(() => FirmaOtpDto)
  firma?: FirmaOtpDto;
}

/**
 * Volver a cargar el informe preliminar (EFDS-1157).
 *
 * Si tiene un error u omisión se carga otro: el anterior queda en el historial
 * con la fecha, el usuario y este motivo.
 */
export class ActualizarInformeDto extends RegistrarResultadoDto {
  @ApiProperty({ description: 'Por qué se vuelve a cargar el informe' })
  @IsString()
  @IsNotEmpty({ message: 'Di por qué se vuelve a cargar el informe: queda en su historial' })
  @MaxLength(1000)
  motivo: string;
}

export class RectificarResultadoDto {
  @ApiProperty({ description: 'Por qué se rectifica el resultado registrado' })
  @IsString()
  @IsNotEmpty({ message: 'Explica por qué se rectifica el resultado' })
  @MinLength(10, { message: 'El motivo debe explicar la rectificación, no una palabra suelta' })
  @MaxLength(1000)
  motivo: string;
}

export class CargarEvidenciaDto {
  /** Qué es el archivo: una lista de adjuntos sin decir cuál es cuál no sustenta nada. */
  @ApiProperty({ description: 'Qué documento se está cargando' })
  @IsString()
  @IsNotEmpty({ message: 'Dí qué documento estás cargando' })
  @Type(() => String)
  @MaxLength(300)
  descripcion: string;
}
