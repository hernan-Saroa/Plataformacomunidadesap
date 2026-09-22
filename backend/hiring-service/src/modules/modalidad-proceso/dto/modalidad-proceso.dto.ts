import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { FirmaOtpDto } from '../../cierre-actividad/dto/firma-otp.dto';

/** La modalidad que el area propone, o corrige tras una devolucion. */
export class CambiarModalidadDto {
  @ApiProperty({ description: 'Código de la modalidad del catálogo' })
  @IsString()
  @IsNotEmpty({ message: 'Elige la modalidad de contratación' })
  @MaxLength(60)
  modalidad: string;
}

/**
 * Lo que el abogado decide sobre la modalidad (EFDS-1183).
 *
 * Dos desenlaces y no tres: devolver es *la* correccion —el area vuelve a
 * elegir y la manda otra vez— y no existe el «esto no procede», porque un
 * proceso siempre se tramita por alguna modalidad. Si ninguna sirve, lo que no
 * procede es la contratacion, y eso se niega en la 3.4.
 */
export class DecidirModalidadDto {
  @ApiProperty({ enum: ['APROBADO', 'DEVUELTO'] })
  @IsIn(['APROBADO', 'DEVUELTO'], {
    message: 'La modalidad se ratifica o se devuelve para corregirla',
  })
  decision: 'APROBADO' | 'DEVUELTO';

  /** Obligatorio al devolver: sin el, el area repetiria la misma eleccion. */
  @ApiProperty({ required: false, description: 'Qué modalidad corresponde y por qué' })
  @IsOptional()
  @IsString()
  @MinLength(10, { message: 'El motivo debe explicar qué modalidad corresponde' })
  @MaxLength(1000)
  observaciones?: string;

  /**
   * Solo si la 3.5 quedó configurada con `EXIGE_FIRMA`. Ratificar sí la pide
   * —es la decisión que cierra la actividad—; devolver no, porque no cierra
   * nada.
   */
  @ApiPropertyOptional({ description: 'Evidencia de la firma OTP, si la actividad la exige' })
  @IsOptional()
  @ValidateNested()
  @Type(() => FirmaOtpDto)
  firma?: FirmaOtpDto;
}
