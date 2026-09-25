import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { DecisionComite } from '../../../entities/comite-contratacion.entity';
import { FirmaOtpDto } from '../../cierre-actividad/dto/firma-otp.dto';

export const DECISIONES_COMITE: DecisionComite[] = [
  'APROBADO',
  'APROBADO_CON_CONDICIONES',
  'OBSERVADO',
  'RECHAZADO',
];

/**
 * Qué actividades anteriores puede reabrir el comité (EFDS-2068).
 *
 * Solo las que guardan su propia fila en `proceso_actividades` con contenido
 * sustantivo: el estudio previo (3.1), que desde la 090 trae también el
 * análisis del sector, la modalidad (3.5) y la causal (3.6). La 3.3 y la 3.4 quedan fuera porque no
 * tienen fila propia —la 3.3 es recibir el proceso en la Dirección y la 3.4 es
 * la decisión del abogado sobre el estudio previo, y las dos viven dentro del
 * ciclo de revisión de la 3.1—: devolver a la 3.1 ya las vuelve a abrir.
 */
export const NUMERALES_REABRIBLES_POR_COMITE = ['3.1', '3.5', '3.6'] as const;

/**
 * Lo que el comite decidio en una sesion — actividad 3.7 (RF-DOC-05).
 *
 * Llega por multipart porque viaja con el acta: es lo unico que prueba que un
 * cuerpo colegiado sesiono, y sin ella el registro es la palabra de quien lo
 * escribe.
 */
export class RegistrarSesionComiteDto {
  @ApiProperty({ description: 'Fecha de la sesión (AAAA-MM-DD)' })
  @IsISO8601({ strict: true }, { message: 'La fecha de la sesión no es válida' })
  fecha: string;

  @ApiProperty({ enum: DECISIONES_COMITE })
  @IsIn(DECISIONES_COMITE, {
    message: 'El comité aprueba, aprueba con condiciones, observa o rechaza',
  })
  decision: DecisionComite;

  /**
   * Obligatorio en la aprobacion condicionada: sin ellas es una aprobacion a
   * secas, y el expediente no podria decir a que quedo sujeto el proceso.
   */
  @ApiProperty({ required: false, description: 'A qué queda condicionada la aprobación' })
  @IsOptional()
  @IsString()
  @MinLength(10, { message: 'Di a que queda condicionada la aprobación' })
  @MaxLength(2000)
  condiciones?: string;

  /**
   * Lo que el comite objeto.
   *
   * Obligatorias al observar —sin ellas el proceso no sabe que corregir— y al
   * rechazar, donde ademas es lo unico que le queda a quien se lo rechazaron:
   * no va a tener ocasion de preguntar corrigiendo. Tambien al aprobar
   * reabriendo alguna actividad, que si no llegaria a su responsable sin decir
   * que hay que validar.
   */
  @ApiProperty({ required: false, description: 'Lo que el comité objeto' })
  @IsOptional()
  @IsString()
  @MinLength(10, { message: 'Di qué objeta el comité: sin eso nadie sabe qué hacer con el proceso' })
  @MaxLength(4000)
  observaciones?: string;

  /**
   * Que actividades anteriores ya cerradas se reabren con esta sesion.
   *
   * Obligatorio al observar —sin esto, observar dejaba el proceso "devuelto"
   * sin que la correccion tuviera donde aplicarse: la 3.1 y las demas ya
   * estaban APROBADO y nada las reabria— y opcional al aprobar, con o sin
   * condiciones, para el caso en que el comite avala el proceso pero quiere
   * que le vuelvan a validar un punto concreto.
   *
   * Es una lista y no un numeral: una sesion de comite revisa el expediente
   * entero y puede objetar el estudio previo y la modalidad o la causal a la
   * vez. Con un solo numeral habia que elegir cual se corregia.
   *
   * Viaja como JSON dentro del multipart, igual que la firma: el cuerpo lleva
   * el acta, y un arreglo en `FormData` llegaria como "3.1,3.2".
   */
  @ApiProperty({
    required: false,
    type: [String],
    enum: NUMERALES_REABRIBLES_POR_COMITE,
    description: 'Numerales que se reabren con esta sesión',
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? JSON.parse(value) : value))
  @IsArray()
  @ArrayMaxSize(NUMERALES_REABRIBLES_POR_COMITE.length)
  @ArrayUnique({ message: 'No repitas el mismo numeral' })
  @IsIn(NUMERALES_REABRIBLES_POR_COMITE, {
    each: true,
    message: 'El comité solo puede reabrir la 3.1, la 3.2, la 3.5 o la 3.6',
  })
  numeralesReabrir?: string[];

  /**
   * Solo si la 3.7 quedó configurada con `EXIGE_FIRMA`. Viaja como string en
   * el multipart, igual que el resto de este DTO al llegar con el acta.
   */
  @ApiPropertyOptional({ description: 'Evidencia de la firma OTP, si la actividad la exige' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? JSON.parse(value) : value))
  @ValidateNested()
  @Type(() => FirmaOtpDto)
  firma?: FirmaOtpDto;
}
