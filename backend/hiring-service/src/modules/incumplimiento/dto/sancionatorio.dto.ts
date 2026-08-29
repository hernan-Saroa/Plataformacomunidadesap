import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Lo comun a las dos resoluciones (EFDS-1181).
 *
 * El documento no va aqui: viaja como multipart, porque una resolucion **es**
 * el documento y registrarla sin el dejaria al expediente afirmando que la
 * entidad resolvio algo que no puede mostrar.
 */
class DatosDeResolucion {
  @ApiProperty({ description: 'Numero de la resolucion' })
  @IsString()
  @IsNotEmpty({ message: 'Registra el numero de la resolucion' })
  @MaxLength(80)
  numero: string;

  @ApiProperty({ description: 'Fecha de expedicion (YYYY-MM-DD)' })
  @IsDateString({}, { message: 'La fecha de expedicion debe tener el formato YYYY-MM-DD' })
  fechaExpedicion: string;
}

/** Resolucion que abre el tramite sancionatorio (EFDS-1181, RF-INC-02). */
export class AbrirTramiteDto extends DatosDeResolucion {}

/**
 * Resolucion que decide el caso (EFDS-1181, RF-INC-02).
 *
 * `DECLARA_CADUCIDAD` es la caducidad como causal contractual del bloque de
 * Presunto Incumplimiento: termina el contrato.
 */
export class DecidirCasoDto extends DatosDeResolucion {
  @ApiProperty({
    description: 'Que resuelve la resolucion',
    enum: ['DECLARA_INCUMPLIMIENTO', 'DECLARA_CADUCIDAD', 'ARCHIVA'],
  })
  @IsIn(['DECLARA_INCUMPLIMIENTO', 'DECLARA_CADUCIDAD', 'ARCHIVA'], {
    message: 'La decision archiva el caso, declara el incumplimiento o declara la caducidad',
  })
  sentido: 'DECLARA_INCUMPLIMIENTO' | 'DECLARA_CADUCIDAD' | 'ARCHIVA';

  @ApiPropertyOptional({
    description: 'Multa o clausula penal que impone la decision, si impone alguna',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'El valor de la sancion debe ser un numero' })
  @IsPositive({ message: 'El valor de la sancion debe ser mayor que cero' })
  valorSancion?: number;
}

/**
 * Citacion a audiencia (EFDS-1181).
 *
 * La fecha **si puede ser futura**: es lo unico del modulo que mira adelante, y
 * una citacion que no pudiera serlo no serviria para citar a nadie.
 */
export class CitarAudienciaDto {
  @ApiProperty({
    description: 'Fecha y hora para la que se cita',
    example: '2026-09-15T09:00:00-05:00',
  })
  @IsDateString({}, { message: 'La fecha de la audiencia va en formato de fecha y hora' })
  citadaPara: string;

  @ApiPropertyOptional({ description: 'Para que se cita, cuando conviene precisarlo' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  objeto?: string;
}

/** Registro de lo que ocurrio en la audiencia (EFDS-1181). */
export class CelebrarAudienciaDto {
  @ApiProperty({ description: 'Fecha en que se celebro (YYYY-MM-DD)' })
  @IsDateString({}, { message: 'La fecha de la audiencia debe tener el formato YYYY-MM-DD' })
  celebradaEl: string;

  @ApiProperty({ description: 'Que paso en la audiencia' })
  @IsString()
  @IsNotEmpty({ message: 'Resume que paso en la audiencia' })
  @MinLength(10, {
    message: 'El resumen es lo que la decision posterior tiene que poder citar',
  })
  @MaxLength(4000)
  resumen: string;
}

/** Suspension o cancelacion de una audiencia citada (EFDS-1181). */
export class CerrarSinCelebrarDto {
  @ApiProperty({ description: 'Por que no se celebro' })
  @IsString()
  @IsNotEmpty({ message: 'Explica por que no se celebro' })
  @MinLength(10, {
    message: 'Una audiencia que no se celebro y no dice por que es lo primero que se pregunta',
  })
  @MaxLength(1000)
  motivo: string;
}

/** Notificacion de la resolucion y, cuando la hay, su firmeza (EFDS-1181). */
export class NotificarResolucionDto {
  @ApiProperty({ description: 'Fecha de la notificacion (YYYY-MM-DD)' })
  @IsDateString({}, { message: 'La fecha de notificacion debe tener el formato YYYY-MM-DD' })
  notificadaEl: string;

  @ApiPropertyOptional({
    description: 'Fecha en que quedo en firme; se omite mientras no lo este',
  })
  @IsOptional()
  @IsDateString({}, { message: 'La fecha de firmeza debe tener el formato YYYY-MM-DD' })
  firmeEl?: string;
}

/** Revocatoria de una resolucion del tramite (EFDS-1181). */
export class RevocarResolucionDto {
  @ApiProperty({ description: 'Por que se revoca' })
  @IsString()
  @IsNotEmpty({ message: 'Explica por que se revoca la resolucion' })
  @MinLength(10, {
    message: 'Revocar deshace lo que la resolucion hizo: sustenta por que',
  })
  @MaxLength(1000)
  motivo: string;
}
