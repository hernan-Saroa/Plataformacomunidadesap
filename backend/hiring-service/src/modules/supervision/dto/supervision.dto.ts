import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Designacion del supervisor por acto administrativo (EFDS-1165).
 *
 * Viaja como multipart porque lleva el acto adjunto: sin el hay un nombre, no
 * un supervisor.
 */
export class DesignarSupervisorDto {
  @ApiProperty({ description: 'id_person de la persona en el directorio' })
  @IsUUID('4', { message: 'El supervisor se identifica con el id de la persona del directorio' })
  personaId: string;

  /**
   * El nombre viaja junto al id y no se resuelve en el servidor: es el que se
   * copia al expediente, y tiene que ser el que el ordenador vio y eligio.
   */
  @ApiProperty({ description: 'Nombre tal como lo designa el acto' })
  @IsString()
  @IsNotEmpty({ message: 'Registra el nombre de quien se designa como supervisor' })
  @MaxLength(200)
  nombre: string;

  @ApiPropertyOptional({ description: 'Cargo que ocupa en la entidad' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  cargo?: string;

  /** Para el aviso que pide la matriz en 8.2, cuando exista notificaciones. */
  @ApiPropertyOptional({ description: 'Correo al que se le avisara de la designacion' })
  @IsOptional()
  @IsEmail({}, { message: 'El correo del supervisor no tiene un formato valido' })
  @MaxLength(200)
  email?: string;

  /** La del acto, no la del registro: es cuando la entidad designo. */
  @ApiProperty({ description: 'Fecha del acto administrativo (YYYY-MM-DD)' })
  @IsDateString({}, { message: 'La fecha de designacion debe tener el formato YYYY-MM-DD' })
  fechaDesignacion: string;
}

/** Relevo del supervisor vigente para designar otro. */
export class RelevarSupervisorDto {
  @ApiProperty({ description: 'Por que se releva al supervisor' })
  @IsString()
  @IsNotEmpty({ message: 'Explica por que se releva al supervisor' })
  @MinLength(10, { message: 'El motivo debe explicar el relevo, no una palabra suelta' })
  @MaxLength(1000)
  motivo: string;
}

/**
 * Reasignacion del supervisor (EFDS-1169, actividad 9.3).
 *
 * Releva al vigente y designa al nuevo en un solo acto. Hacerlo en dos pasos
 * dejaria el contrato sin quien lo vigile entre uno y otro, y la historia habla
 * de «reasignar», no de dos operaciones sueltas.
 */
export class ReasignarSupervisorDto extends DesignarSupervisorDto {
  @ApiProperty({ description: 'Por que se cambia de supervisor' })
  @IsString()
  @IsNotEmpty({ message: 'Explica por que se reasigna la supervision' })
  @MinLength(10, { message: 'El motivo debe explicar el cambio, no una palabra suelta' })
  @MaxLength(1000)
  motivo: string;
}
