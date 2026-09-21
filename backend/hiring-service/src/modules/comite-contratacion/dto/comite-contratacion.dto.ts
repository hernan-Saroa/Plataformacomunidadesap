import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsISO8601, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

import { DecisionComite } from '../../../entities/comite-contratacion.entity';

export const DECISIONES_COMITE: DecisionComite[] = [
  'APROBADO',
  'APROBADO_CON_CONDICIONES',
  'OBSERVADO',
];

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
}
