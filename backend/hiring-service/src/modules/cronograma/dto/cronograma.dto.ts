import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

import { ETAPAS_DEL_CRONOGRAMA } from '../cronograma-etapas';

export class EtapaCronogramaDto {
  @ApiProperty({ description: 'Etapa macro (5 a 10)' })
  @IsIn([...ETAPAS_DEL_CRONOGRAMA], { message: 'El cronograma programa las etapas 5 a 10' })
  etapa: number;

  @ApiPropertyOptional({ description: 'Desde cuándo (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString({}, { message: 'La fecha de inicio debe tener el formato YYYY-MM-DD' })
  fechaInicio?: string | null;

  /** Sin fecha de fin la etapa queda sin programar y no alerta. */
  @ApiPropertyOptional({ description: 'Hasta cuándo debería estar cumplida (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString({}, { message: 'La fecha de fin debe tener el formato YYYY-MM-DD' })
  fechaFin?: string | null;

  @ApiPropertyOptional({ description: 'Observación sobre la etapa' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  nota?: string | null;
}

export class GuardarCronogramaDto {
  /** Todas las etapas de una vez: lo que no viene con fecha de fin se quita. */
  @ApiProperty({ type: [EtapaCronogramaDto] })
  @IsArray()
  @ArrayMaxSize(ETAPAS_DEL_CRONOGRAMA.length)
  @ValidateNested({ each: true })
  @Type(() => EtapaCronogramaDto)
  etapas: EtapaCronogramaDto[];

  /** Si el cambio viene de una adenda de cronograma publicada (138). */
  @ApiPropertyOptional({ description: 'Adenda de cronograma que origina el cambio' })
  @IsOptional()
  @IsUUID('4')
  adendaId?: string;

  @ApiPropertyOptional({ description: 'Por qué cambian las fechas; queda en el historial' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  motivo?: string;
}

/** Marcar o desmarcar cumplida una actividad propia (139). */
export class CumplidaCronogramaDto {
  @ApiProperty({ description: 'true la da por cumplida; false la vuelve a vigilar' })
  @IsBoolean()
  cumplida: boolean;
}

/** Una actividad del cronograma con su alerta (138, sesión de QA del 04/11). */
export class ActividadCronogramaDto {
  /** Las del flujo. Una propia (139) llega sin numeral, con nombre y etapa. */
  @ApiPropertyOptional({ description: 'Numeral de la actividad del flujo (5.6, 6.1, 5.12.1…)' })
  @IsOptional()
  @IsString()
  @Matches(/^\d+\.\d+(\.\d+)?$/, { message: 'El numeral de la actividad no es válido' })
  numeral?: string | null;

  /** Una propia ya guardada; la nueva llega sin él (139). */
  @ApiPropertyOptional({ description: 'Id de la actividad propia ya guardada' })
  @IsOptional()
  @IsUUID('4', { message: 'La actividad propia no es válida' })
  id?: string | null;

  @ApiPropertyOptional({ description: 'Nombre de la actividad propia (139)' })
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'El nombre de la actividad va hasta 200 caracteres' })
  nombre?: string | null;

  @ApiPropertyOptional({ description: 'Etapa (5 a 10) de la actividad propia (139)' })
  @IsOptional()
  @IsIn([...ETAPAS_DEL_CRONOGRAMA], { message: 'Una actividad propia va en una de las etapas 5 a 10' })
  etapa?: number | null;

  @ApiPropertyOptional({ description: 'Desde cuándo (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString({}, { message: 'La fecha de inicio debe tener el formato YYYY-MM-DD' })
  fechaInicio?: string | null;

  /** Sin fecha de fin la actividad queda sin programar y no alerta. */
  @ApiPropertyOptional({ description: 'Hasta cuándo (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString({}, { message: 'La fecha de fin debe tener el formato YYYY-MM-DD' })
  fechaFin?: string | null;

  /** Sin él, la anticipación general del cronograma (Parámetros de alertas). */
  @ApiPropertyOptional({ description: 'Cuántos días antes del vencimiento se avisa' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(90)
  diasAntes?: number | null;

  @ApiPropertyOptional({
    description: 'A quién se avisa',
    enum: ['QUIEN_LA_HACE', 'ABOGADO_ESTRUCTURADOR', 'ABOGADO_REVISOR', 'GESTOR_DE_ARCHIVO'],
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(4)
  @IsString({ each: true })
  avisarA?: string[] | null;

  @ApiPropertyOptional({ description: 'Por dónde se avisa', enum: ['CAMPANA', 'CORREO', 'AMBOS'] })
  @IsOptional()
  @IsIn(['CAMPANA', 'CORREO', 'AMBOS'], { message: 'El canal es campanita, correo o ambos' })
  canal?: string | null;

  /** Otros destinatarios, escritos a mano: les llega solo por correo. */
  @ApiPropertyOptional({ description: 'Correos adicionales', isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  correos?: string[] | null;

  @ApiPropertyOptional({ description: 'Observación sobre la actividad' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  nota?: string | null;
}

export class GuardarActividadesCronogramaDto {
  /** Todas las actividades de una vez: lo que no viene con fecha de fin se quita. */
  @ApiProperty({ type: [ActividadCronogramaDto] })
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => ActividadCronogramaDto)
  actividades: ActividadCronogramaDto[];

  /** Si el cambio viene de una adenda de cronograma publicada. */
  @ApiPropertyOptional({ description: 'Adenda de cronograma que origina el cambio' })
  @IsOptional()
  @IsUUID('4')
  adendaId?: string;

  @ApiPropertyOptional({ description: 'Por qué cambian las fechas; queda en el historial' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  motivo?: string;
}
