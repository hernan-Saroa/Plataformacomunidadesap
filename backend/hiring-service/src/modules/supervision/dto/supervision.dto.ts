import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
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
   * La cuenta y no la persona del directorio (121): quien se designa ocupa el
   * puesto que avala la 9.4, y es la cuenta la que inicia sesión. El nombre,
   * el correo y la persona se toman de ella.
   */
  @ApiProperty({ description: 'id_user de la cuenta que se designa, entre los candidatos del puesto' })
  @IsUUID('all', { message: 'El supervisor se elige entre las cuentas que pueden ocupar el puesto' })
  usuarioId: string;

  @ApiPropertyOptional({ description: 'Cargo que ocupa en la entidad' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  cargo?: string;

  @ApiProperty({ description: 'Fecha del acto administrativo (YYYY-MM-DD)' })
  @IsDateString({}, { message: 'La fecha de designación debe tener el formato YYYY-MM-DD' })
  fechaDesignacion: string;

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
