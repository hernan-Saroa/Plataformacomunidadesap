import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { FirmaDelMultipart, FirmaOtpDto } from '../../cierre-actividad/dto/firma-otp.dto';

/**
 * Designacion del supervisor por acto administrativo (EFDS-1165).
 *
 * Viaja como multipart porque lleva el acto adjunto: sin el hay un nombre, no
 * un supervisor.
 */
export class DesignarSupervisorDto {
  /**
   * El supervisor no entra a la aplicación (136): se registra con lo que dice
   * el acto, escrito a mano. Lo que hace en las etapas 9 y 10 lo registran
   * por él el abogado estructurador y el gestor de archivo y supervisión.
   */
  @ApiProperty({ description: 'Nombre completo del supervisor, como figura en el acto' })
  @IsString()
  @IsNotEmpty({ message: 'Escribe el nombre del supervisor' })
  @MaxLength(200)
  nombre: string;

  @ApiPropertyOptional({ description: 'Cargo que ocupa en la entidad' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  cargo?: string;

  /**
   * A donde le llega el memorando (124). Obligatorio desde la sesión de QA del
   * 04/11: la notificación sale del módulo y es la evidencia de la designación.
   */
  @ApiProperty({ description: 'Correo del supervisor' })
  @IsString()
  @IsNotEmpty({ message: 'Escribe el correo del supervisor: a él le llega la notificación' })
  @IsEmail({}, { message: 'El correo del supervisor no es válido' })
  @MaxLength(200)
  email: string;

  @ApiProperty({ description: 'Fecha del acto administrativo (YYYY-MM-DD)' })
  @IsDateString({}, { message: 'La fecha de designación debe tener el formato YYYY-MM-DD' })
  fechaDesignacion: string;

  /**
   * Lo que quien designa le quiere decir en el correo (124). El correo sale
   * igual sin él: lleva el contrato, el proceso y el acto.
   */
  @ApiPropertyOptional({ description: 'Mensaje para el supervisor en el correo de la designación' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  mensaje?: string;

  /** Solo si la 8.2 quedo configurada con `EXIGE_FIRMA` (EFDS-2070). */
  @ApiPropertyOptional({ description: 'Evidencia de la firma OTP, si la actividad la exige' })
  @IsOptional()
  @FirmaDelMultipart()
  @ValidateNested()
  @Type(() => FirmaOtpDto)
  firma?: FirmaOtpDto;
}

/** Relevo del supervisor vigente para designar otro. */
export class RelevarSupervisorDto {
  @ApiProperty({ description: 'Por qué se releva al supervisor' })
  @IsString()
  @IsNotEmpty({ message: 'Explica por qué se releva al supervisor' })
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
  @ApiProperty({ description: 'Por qué se cambia de supervisor' })
  @IsString()
  @IsNotEmpty({ message: 'Explica por qué se reasigna la supervisión' })
  @MinLength(10, { message: 'El motivo debe explicar el cambio, no una palabra suelta' })
  @MaxLength(1000)
  motivo: string;
}

/**
 * Volver a mandarle el correo al supervisor vigente (124): porque no salió, o
 * para mandarle documentos que faltaban. Los nuevos se suman a los de antes.
 */
export class ReenviarCorreoSupervisorDto {
  @ApiPropertyOptional({ description: 'Mensaje para el supervisor; sin él, el de la designación' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  mensaje?: string;
}
