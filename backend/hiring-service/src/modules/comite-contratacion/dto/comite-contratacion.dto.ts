import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsISO8601, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

import { DecisionComite } from '../../../entities/comite-contratacion.entity';

export const DECISIONES_COMITE: DecisionComite[] = [
  'APROBADO',
  'APROBADO_CON_CONDICIONES',
  'OBSERVADO',
];

/**
 * A qué numerales anteriores puede volver el proceso cuando el comité observa
 * (EFDS-2068).
 *
 * Solo los que guardan su propia fila en `proceso_actividades` con contenido
 * sustantivo: el estudio previo (3.1), el análisis del sector (3.2), la
 * modalidad (3.5) y la causal (3.6). La 3.3 y la 3.4 quedan fuera porque no
 * tienen fila propia —la 3.3 es recibir el proceso en la Dirección y la 3.4 es
 * la decisión del abogado sobre el estudio previo, y las dos viven dentro del
 * ciclo de revisión de la 3.1—: devolver a la 3.1 ya las vuelve a abrir.
 */
export const NUMERALES_REABRIBLES_POR_COMITE = ['3.1', '3.2', '3.5', '3.6'] as const;

/**
 * Lo que el comite decidio en una sesion — actividad 3.7 (RF-DOC-05).
 *
 * Llega por multipart porque viaja con el acta: es lo unico que prueba que un
 * cuerpo colegiado sesiono, y sin ella el registro es la palabra de quien lo
 * escribe.
 */
export class RegistrarSesionComiteDto {
  @ApiProperty({ description: 'Fecha de la sesion (AAAA-MM-DD)' })
  @IsISO8601({ strict: true }, { message: 'La fecha de la sesion no es valida' })
  fecha: string;

  @ApiProperty({ enum: DECISIONES_COMITE })
  @IsIn(DECISIONES_COMITE, {
    message: 'El comite aprueba, aprueba con condiciones u observa',
  })
  decision: DecisionComite;

  /**
   * Obligatorio en la aprobacion condicionada: sin ellas es una aprobacion a
   * secas, y el expediente no podria decir a que quedo sujeto el proceso.
   */
  @ApiProperty({ required: false, description: 'A que queda condicionada la aprobacion' })
  @IsOptional()
  @IsString()
  @MinLength(10, { message: 'Di a que queda condicionada la aprobacion' })
  @MaxLength(2000)
  condiciones?: string;

  /** Obligatorias al observar: sin ellas el proceso no sabe que corregir. */
  @ApiProperty({ required: false, description: 'Observaciones de fondo del comite' })
  @IsOptional()
  @IsString()
  @MinLength(10, { message: 'Las observaciones de fondo tienen que decir que corregir' })
  @MaxLength(4000)
  observaciones?: string;

  /**
   * A que actividad anterior vuelve el proceso cuando el comite observa
   * (EFDS-2068). Sin esto, observar dejaba el proceso "devuelto" sin que la
   * correccion tuviera donde aplicarse: la 3.1 y las demas ya estaban
   * APROBADO y nada las reabria.
   */
  @ApiProperty({
    required: false,
    enum: NUMERALES_REABRIBLES_POR_COMITE,
    description: 'Numeral al que vuelve el proceso al observar',
  })
  @IsOptional()
  @IsIn(NUMERALES_REABRIBLES_POR_COMITE, {
    message: 'El comite solo puede devolver a la 3.1, la 3.2, la 3.5 o la 3.6',
  })
  numeralDevolucion?: string;
}
